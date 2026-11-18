from datetime import timedelta

from django.conf import settings
from django.db.models import Count
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .draw import next_draw_allowed_at
from .models import Assignment, Group, Membership

ACTIVITY_LIMIT = 8
CHART_DAYS = 14


def _person(user):
    return {'id': user.id, 'name': user.first_name}


@api_view(['GET'])
def dashboard(request):
    user = request.user
    now = timezone.now()
    min_members = settings.GIFTING_MIN_MEMBERS

    # Filter through a subquery so the member count isn't skewed by the join on memberships.
    my_group_ids = Membership.objects.filter(user=user).values('group_id')
    groups = list(
        Group.objects.filter(id__in=my_group_ids)
        .annotate(member_count=Count('memberships'))
        .prefetch_related('memberships__user')
        .order_by('-created_at')
    )
    # Only ever the requester's own receivers -- never who gifts them.
    receivers = {
        a.group_id: a.receiver
        for a in Assignment.objects.filter(giver=user, group__in=groups).select_related('receiver')
    }

    group_rows = []
    for g in groups:
        allowed_at = next_draw_allowed_at(g)
        receiver = receivers.get(g.id)
        group_rows.append({
            'id': g.id,
            'name': g.name,
            'code': g.code,
            'is_owner': g.owner_id == user.id,
            'member_count': g.member_count,
            'members_preview': [_person(m.user) for m in list(g.memberships.all())[:5]],
            'drawn_at': g.drawn_at,
            'next_draw_at': allowed_at,
            'my_receiver': _person(receiver) if receiver else None,
        })

    co_members = (
        Membership.objects.filter(group_id__in=my_group_ids).exclude(user=user).values('user').distinct().count()
    )

    activity = []
    joins = Membership.objects.filter(group_id__in=my_group_ids).select_related('user', 'group')
    for m in joins.order_by('-joined_at')[:ACTIVITY_LIMIT]:
        created = m.user_id == m.group.owner_id and abs(m.joined_at - m.group.created_at) < timedelta(seconds=5)
        activity.append({
            'kind': 'created' if created else 'joined',
            'at': m.joined_at,
            'user': _person(m.user),
            'group': {'id': m.group_id, 'name': m.group.name},
        })
    for g in groups:
        if g.drawn_at:
            activity.append({'kind': 'drawn', 'at': g.drawn_at, 'user': None, 'group': {'id': g.id, 'name': g.name}})
    activity = sorted(activity, key=lambda a: a['at'], reverse=True)[:ACTIVITY_LIMIT]

    today = timezone.localdate()
    start = today - timedelta(days=CHART_DAYS - 1)
    per_day = dict(
        joins.filter(joined_at__date__gte=start)
        .exclude(user=user)
        .order_by()
        .values_list('joined_at__date')
        .annotate(n=Count('id'))
    )
    joins_by_day = [
        {'date': start + timedelta(days=i), 'count': per_day.get(start + timedelta(days=i), 0)}
        for i in range(CHART_DAYS)
    ]

    return Response({
        'stats': {
            'groups': len(groups),
            'admin_of': sum(1 for g in groups if g.owner_id == user.id),
            'drawn': sum(1 for g in groups if g.drawn_at),
            'awaiting_draw': sum(1 for g in groups if not g.drawn_at),
            'people': co_members,
            'gifting': len(receivers),
        },
        'min_members': min_members,
        'now': now,
        'groups': group_rows,
        'activity': activity,
        'joins_by_day': joins_by_day,
    })
