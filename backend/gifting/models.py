import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone

# No 0/O/1/I/L so codes are easy to read out loud and type.
CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
CODE_LENGTH = 6


def generate_code():
    while True:
        code = ''.join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
        if not Group.objects.filter(code=code).exists():
            return code


class Group(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=CODE_LENGTH, unique=True, default=generate_code)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_groups')
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through='Membership', related_name='gift_groups')
    # Null until the first draw; joining is closed once it's set.
    drawn_at = models.DateTimeField(null=True, blank=True)
    # The invite code stops working after this. Set when the group is created;
    # null only for groups made before deadlines existed (no limit).
    join_deadline = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} ({self.code})'

    @property
    def is_drawn(self):
        return self.drawn_at is not None

    @property
    def is_code_expired(self):
        return self.join_deadline is not None and timezone.now() >= self.join_deadline


class Membership(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberships')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['group', 'user'], name='unique_membership')]
        ordering = ['joined_at']


class RemovedMember(models.Model):
    """Someone the admin removed; they can't rejoin with the invite code."""

    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='removed_members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='+')
    removed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['group', 'user'], name='unique_removed_member')]


class Assignment(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='assignments')
    giver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='+')
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='+')

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['group', 'giver'], name='unique_giver_per_group'),
            models.UniqueConstraint(fields=['group', 'receiver'], name='unique_receiver_per_group'),
            models.CheckConstraint(condition=~models.Q(giver=models.F('receiver')), name='no_self_assignment'),
        ]
