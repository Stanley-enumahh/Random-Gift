from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Profile

from .draw import make_pairs
from .models import Assignment, Group, Membership

User = get_user_model()


class MakePairsTests(TestCase):
    def test_single_cycle_with_no_self_gifting(self):
        ids = list(range(1, 9))
        for _ in range(50):
            pairs = dict(make_pairs(ids))
            self.assertEqual(sorted(pairs), ids)
            self.assertEqual(sorted(pairs.values()), ids)
            self.assertTrue(all(g != r for g, r in pairs.items()))
            # Following the chain from anyone visits everyone exactly once.
            seen, current = set(), ids[0]
            while current not in seen:
                seen.add(current)
                current = pairs[current]
            self.assertEqual(len(seen), len(ids))


class GroupApiTests(TestCase):
    def setUp(self):
        self.users = [
            User.objects.create_user(username=f'u{i}@x.com', email=f'u{i}@x.com', first_name=f'User {i}', password='pw')
            for i in range(5)
        ]
        self.owner = self.users[0]

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def make_group(self, member_count, deadline=None):
        deadline = deadline or timezone.now() + timedelta(days=3)
        group = self.client_for(self.owner).post('/api/groups/', {'name': 'Office', 'join_deadline': deadline.isoformat()}).json()
        for user in self.users[1:member_count]:
            self.client_for(user).post('/api/groups/join/', {'code': group['code']})
        return group

    def test_create_requires_future_deadline(self):
        owner = self.client_for(self.owner)
        self.assertIn('join_deadline', owner.post('/api/groups/', {'name': 'X'}).json())
        past = (timezone.now() - timedelta(hours=1)).isoformat()
        self.assertIn('join_deadline', owner.post('/api/groups/', {'name': 'X', 'join_deadline': past}).json())
        too_far = (timezone.now() + timedelta(days=400)).isoformat()
        self.assertIn('join_deadline', owner.post('/api/groups/', {'name': 'X', 'join_deadline': too_far}).json())

    def test_code_stops_working_after_deadline(self):
        group = self.make_group(2)
        self.assertFalse(group['code_expired'])
        later = timezone.now() + timedelta(days=3, minutes=1)
        with mock.patch('django.utils.timezone.now', return_value=later):
            res = self.client_for(self.users[2]).post('/api/groups/join/', {'code': group['code']})
            self.assertEqual(res.status_code, 400)
            self.assertIn('expired', res.json()['detail'])
            self.assertTrue(self.client_for(self.owner).get(f'/api/groups/{group["id"]}/').json()['code_expired'])
            # Existing members are unaffected.
            self.assertEqual(self.client_for(self.users[1]).get(f'/api/groups/{group["id"]}/').status_code, 200)

            # The admin can extend it, which makes the code work again; members can't.
            url = f'/api/groups/{group["id"]}/'
            new_deadline = (later + timedelta(days=2)).isoformat()
            self.assertEqual(self.client_for(self.users[1]).patch(url, {'join_deadline': new_deadline}).status_code, 403)
            res = self.client_for(self.owner).patch(url, {'join_deadline': new_deadline})
            self.assertEqual(res.status_code, 200)
            self.assertFalse(res.json()['code_expired'])
            res = self.client_for(self.users[2]).post('/api/groups/join/', {'code': group['code']})
            self.assertEqual(res.status_code, 201)

    def test_join_by_code_is_case_and_dash_insensitive(self):
        group = self.make_group(1)
        code = group['code'].lower()
        res = self.client_for(self.users[1]).post('/api/groups/join/', {'code': f'{code[:3]}-{code[3:]}'})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Membership.objects.filter(group_id=group['id']).count(), 2)

    def test_draw_needs_four_members(self):
        group = self.make_group(3)
        res = self.client_for(self.owner).post(f'/api/groups/{group["id"]}/draw/')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(Assignment.objects.exists())

    def test_only_owner_can_draw(self):
        group = self.make_group(4)
        res = self.client_for(self.users[1]).post(f'/api/groups/{group["id"]}/draw/')
        self.assertEqual(res.status_code, 400)

    def test_members_see_only_who_they_gift(self):
        group = self.make_group(4)
        self.client_for(self.owner).post(f'/api/groups/{group["id"]}/draw/')
        for user in self.users[:4]:
            data = self.client_for(user).get(f'/api/groups/{group["id"]}/').json()
            expected = Assignment.objects.get(group_id=group['id'], giver=user).receiver_id
            self.assertEqual(data['my_receiver']['id'], expected)
            self.assertNotIn('assignments', data)

    def test_cannot_join_after_draw(self):
        group = self.make_group(4)
        self.client_for(self.owner).post(f'/api/groups/{group["id"]}/draw/')
        res = self.client_for(self.users[4]).post('/api/groups/join/', {'code': group['code']})
        self.assertEqual(res.status_code, 400)

    def test_redraw_waits_ten_hours(self):
        group = self.make_group(4)
        url = f'/api/groups/{group["id"]}/draw/'
        owner = self.client_for(self.owner)
        self.assertEqual(owner.post(url).status_code, 200)
        self.assertEqual(owner.post(url).status_code, 400)

        later = timezone.now() + timedelta(hours=10, minutes=1)
        with mock.patch('django.utils.timezone.now', return_value=later):
            self.assertEqual(owner.post(url).status_code, 200)
        self.assertEqual(Assignment.objects.filter(group_id=group['id']).count(), 4)

    def test_dashboard_stats_and_privacy(self):
        group = self.make_group(4)
        self.client_for(self.owner).post(f'/api/groups/{group["id"]}/draw/')
        deadline = (timezone.now() + timedelta(days=3)).isoformat()
        other = self.client_for(self.users[4]).post('/api/groups/', {'name': 'Not mine', 'join_deadline': deadline}).json()

        data = self.client_for(self.owner).get('/api/dashboard/').json()
        self.assertEqual(data['stats'], {
            'groups': 1, 'admin_of': 1, 'drawn': 1, 'awaiting_draw': 0, 'people': 3, 'gifting': 1,
        })
        row = data['groups'][0]
        self.assertEqual(row['member_count'], 4)
        expected = Assignment.objects.get(group_id=group['id'], giver=self.owner).receiver_id
        self.assertEqual(row['my_receiver']['id'], expected)
        self.assertNotIn(other['id'], [g['id'] for g in data['groups']])
        self.assertEqual(sum(d['count'] for d in data['joins_by_day']), 3)
        self.assertEqual(data['activity'][0]['kind'], 'drawn')
        self.assertEqual(row['code'], group['code'])

        member_row = self.client_for(self.users[1]).get('/api/dashboard/').json()['groups'][0]
        self.assertIsNone(member_row['code'])

    def test_only_admin_gets_invite_code(self):
        group = self.make_group(2)
        self.assertEqual(len(group['code']), 6)
        url = f'/api/groups/{group["id"]}/'
        self.assertEqual(self.client_for(self.owner).get(url).json()['code'], group['code'])
        self.assertIsNone(self.client_for(self.users[1]).get(url).json()['code'])
        self.assertIsNone(self.client_for(self.users[1]).get('/api/groups/').json()[0]['code'])

    def test_admin_removes_member_who_cannot_rejoin(self):
        group = self.make_group(3)
        url = f'/api/groups/{group["id"]}/members/{self.users[1].id}/'

        self.assertEqual(self.client_for(self.users[2]).delete(url).status_code, 403)
        res = self.client_for(self.owner).delete(url)
        self.assertEqual(res.status_code, 200)
        self.assertNotIn(self.users[1].id, [m['id'] for m in res.json()['members']])

        rejoin = self.client_for(self.users[1]).post('/api/groups/join/', {'code': group['code']})
        self.assertEqual(rejoin.status_code, 403)
        self.assertEqual(self.client_for(self.users[1]).get(f'/api/groups/{group["id"]}/').status_code, 404)

    def test_members_see_each_others_phone_numbers(self):
        group = self.make_group(2)
        Profile.objects.create(user=self.owner, phone='+2348012345678')
        data = self.client_for(self.users[1]).get(f'/api/groups/{group["id"]}/').json()
        phones = {m['id']: m['phone'] for m in data['members']}
        self.assertEqual(phones, {self.owner.id: '+2348012345678', self.users[1].id: ''})
        self.assertNotIn('email', data['members'][0])

    def test_admin_cannot_remove_self(self):
        group = self.make_group(2)
        res = self.client_for(self.owner).delete(f'/api/groups/{group["id"]}/members/{self.owner.id}/')
        self.assertEqual(res.status_code, 400)

    def test_removing_after_draw_clears_the_draw(self):
        group = self.make_group(5)
        owner = self.client_for(self.owner)
        owner.post(f'/api/groups/{group["id"]}/draw/')
        res = owner.delete(f'/api/groups/{group["id"]}/members/{self.users[4].id}/')
        self.assertIsNone(res.json()['drawn_at'])
        self.assertFalse(Assignment.objects.filter(group_id=group['id']).exists())
        # Four left, so a fresh draw works straight away.
        self.assertEqual(owner.post(f'/api/groups/{group["id"]}/draw/').status_code, 200)

    def test_non_members_cannot_see_group(self):
        group = self.make_group(1)
        res = self.client_for(self.users[4]).get(f'/api/groups/{group["id"]}/')
        self.assertEqual(res.status_code, 404)
