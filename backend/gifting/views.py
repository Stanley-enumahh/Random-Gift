from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import draw as draw_service
from .models import Group, Membership, RemovedMember
from .serializers import GroupDetailSerializer, GroupListSerializer, JoinSerializer


def _my_group(request, group_id):
    # Non-members get a 404 rather than a 403 so group ids can't be probed.
    return get_object_or_404(Group, pk=group_id, memberships__user=request.user)


def _detail(request, group, status_code=status.HTTP_200_OK):
    return Response(GroupDetailSerializer(group, context={'request': request}).data, status=status_code)


@api_view(['GET', 'POST'])
def groups(request):
    if request.method == 'GET':
        qs = Group.objects.filter(memberships__user=request.user).order_by('-created_at')
        return Response(GroupListSerializer(qs, many=True, context={'request': request}).data)

    serializer = GroupListSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        group = serializer.save(owner=request.user)
        Membership.objects.create(group=group, user=request.user)
    return _detail(request, group, status.HTTP_201_CREATED)


@api_view(['POST'])
def join(request):
    serializer = JoinSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    group = Group.objects.filter(code=serializer.validated_data['code']).first()
    if group is None:
        return Response({'detail': 'No group found with that code.'}, status=status.HTTP_404_NOT_FOUND)
    if group.memberships.filter(user=request.user).exists():
        return _detail(request, group)
    if group.removed_members.filter(user=request.user).exists():
        return Response({'detail': 'The admin removed you from this group.'}, status=status.HTTP_403_FORBIDDEN)
    if group.is_drawn:
        return Response({'detail': 'This group has already drawn names.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        Membership.objects.create(group=group, user=request.user)
    except IntegrityError:
        pass  # Joined concurrently from another tab; already a member.
    return _detail(request, group, status.HTTP_201_CREATED)


@api_view(['GET'])
def group_detail(request, group_id):
    return _detail(request, _my_group(request, group_id))


@api_view(['DELETE'])
def remove_member(request, group_id, user_id):
    group = _my_group(request, group_id)
    if group.owner_id != request.user.id:
        return Response({'detail': 'Only the group admin can remove members.'}, status=status.HTTP_403_FORBIDDEN)
    if user_id == request.user.id:
        return Response({'detail': "You can't remove yourself as the admin."}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        group = Group.objects.select_for_update().get(pk=group.pk)
        deleted, _ = group.memberships.filter(user_id=user_id).delete()
        if not deleted:
            return Response({'detail': 'That person is not in this group.'}, status=status.HTTP_404_NOT_FOUND)
        RemovedMember.objects.get_or_create(group=group, user_id=user_id)
        if group.is_drawn:
            # The removed person was someone's giver and someone's receiver, so the
            # loop is broken. Clear the draw; the group reopens for a fresh one.
            group.assignments.all().delete()
            group.drawn_at = None
            group.save(update_fields=['drawn_at'])
    return _detail(request, group)


@api_view(['POST'])
def draw(request, group_id):
    group = _my_group(request, group_id)
    try:
        group = draw_service.draw(group.id, request.user)
    except draw_service.DrawError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return _detail(request, group)
