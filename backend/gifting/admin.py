from django.contrib import admin

from .models import Group, Membership


class MembershipInline(admin.TabularInline):
    model = Membership
    extra = 0


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'owner', 'drawn_at', 'created_at']
    inlines = [MembershipInline]
    # Assignments are deliberately not registered so they stay secret even in the admin.
