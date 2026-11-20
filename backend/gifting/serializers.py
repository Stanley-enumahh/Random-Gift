from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import serializers

from .draw import next_draw_allowed_at
from .models import Assignment, Group

MAX_JOIN_WINDOW_DAYS = 365


class PersonSerializer(serializers.Serializer):
    # Name only: group members shouldn't see each other's emails.
    id = serializers.IntegerField()
    name = serializers.CharField(source='first_name')


class MemberSerializer(PersonSerializer):
    # Fellow group members can see each other's phone numbers (never emails).
    phone = serializers.SerializerMethodField()

    def get_phone(self, user):
        profile = getattr(user, 'profile', None)
        return profile.phone if profile else ''


class GroupListSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(source='memberships.count', read_only=True)
    is_owner = serializers.SerializerMethodField()
    code = serializers.SerializerMethodField()
    # Required when creating a group; older groups may still have none.
    join_deadline = serializers.DateTimeField()
    code_expired = serializers.BooleanField(source='is_code_expired', read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'code', 'member_count', 'is_owner', 'drawn_at', 'join_deadline', 'code_expired']
        read_only_fields = ['drawn_at']

    def validate_join_deadline(self, value):
        now = timezone.now()
        if value <= now + timedelta(minutes=5):
            raise serializers.ValidationError('Pick a joining deadline in the future.')
        if value > now + timedelta(days=MAX_JOIN_WINDOW_DAYS):
            raise serializers.ValidationError(f'The deadline must be within {MAX_JOIN_WINDOW_DAYS} days.')
        return value

    def get_is_owner(self, group):
        return group.owner_id == self.context['request'].user.id

    def get_code(self, group):
        # Only the admin can invite people, so only the admin gets the code.
        return group.code if self.get_is_owner(group) else None


class GroupDetailSerializer(GroupListSerializer):
    owner = PersonSerializer(read_only=True)
    members = serializers.SerializerMethodField()
    my_receiver = serializers.SerializerMethodField()
    min_members = serializers.SerializerMethodField()
    next_draw_at = serializers.SerializerMethodField()
    can_draw = serializers.SerializerMethodField()

    class Meta(GroupListSerializer.Meta):
        fields = GroupListSerializer.Meta.fields + [
            'owner', 'members', 'my_receiver', 'min_members', 'next_draw_at', 'can_draw',
        ]

    def get_members(self, group):
        members = group.memberships.select_related('user__profile')
        return MemberSerializer([m.user for m in members], many=True).data

    def get_my_receiver(self, group):
        # Only ever expose the requester's own receiver -- never who gifts them.
        assignment = (
            Assignment.objects.filter(group=group, giver=self.context['request'].user)
            .select_related('receiver')
            .first()
        )
        return PersonSerializer(assignment.receiver).data if assignment else None

    def get_min_members(self, group):
        return settings.GIFTING_MIN_MEMBERS

    def get_next_draw_at(self, group):
        return next_draw_allowed_at(group)

    def get_can_draw(self, group):
        if group.owner_id != self.context['request'].user.id:
            return False
        if group.memberships.count() < settings.GIFTING_MIN_MEMBERS:
            return False
        allowed_at = next_draw_allowed_at(group)
        return allowed_at is None or timezone.now() >= allowed_at


class JoinSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=20)

    def validate_code(self, value):
        return value.strip().upper().replace('-', '').replace(' ', '')
