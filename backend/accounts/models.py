from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

# After "Not now", wait this long before asking for a phone number again.
PHONE_PROMPT_SNOOZE = timedelta(days=7)


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    # Stored normalised: optional leading +, then digits only.
    phone = models.CharField(max_length=20, blank=True)
    phone_prompt_dismissed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'Profile for {self.user}'

    @property
    def should_prompt_for_phone(self):
        if self.phone:
            return False
        return self.phone_prompt_dismissed_at is None or (
            timezone.now() - self.phone_prompt_dismissed_at >= PHONE_PROMPT_SNOOZE
        )


def profile_for(user):
    # Created lazily so existing accounts don't need a data migration.
    profile, _ = Profile.objects.get_or_create(user=user)
    return profile
