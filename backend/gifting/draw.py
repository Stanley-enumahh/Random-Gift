import secrets
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Assignment, Group


class DrawError(Exception):
    pass


def make_pairs(user_ids):
    """Shuffle members into one cycle: each person gifts the next, the last gifts the first.

    A single cycle means nobody draws themselves and there are no closed
    sub-loops (A<->B) that would let people deduce their gifter.
    """
    order = list(user_ids)
    secrets.SystemRandom().shuffle(order)
    return [(order[i], order[(i + 1) % len(order)]) for i in range(len(order))]


def next_draw_allowed_at(group):
    if group.drawn_at is None:
        return None
    return group.drawn_at + timedelta(hours=settings.GIFTING_REDRAW_COOLDOWN_HOURS)


def draw(group_id, user):
    with transaction.atomic():
        # Lock the row so a double-click can't run two draws at once.
        group = Group.objects.select_for_update().get(pk=group_id)

        if group.owner_id != user.id:
            raise DrawError('Only the group admin can draw.')

        allowed_at = next_draw_allowed_at(group)
        if allowed_at and timezone.now() < allowed_at:
            raise DrawError('You can redraw 10 hours after the last draw.')

        member_ids = list(group.memberships.values_list('user_id', flat=True))
        if len(member_ids) < settings.GIFTING_MIN_MEMBERS:
            raise DrawError(f'You need at least {settings.GIFTING_MIN_MEMBERS} members to draw.')

        group.assignments.all().delete()
        Assignment.objects.bulk_create(
            Assignment(group=group, giver_id=giver, receiver_id=receiver)
            for giver, receiver in make_pairs(member_ids)
        )
        group.drawn_at = timezone.now()
        group.save(update_fields=['drawn_at'])
        return group
