from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import profile_for
from .serializers import LoginSerializer, MeSerializer, SignupSerializer, UserSerializer


def _auth_response(user, status_code=status.HTTP_200_OK):
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status_code)


@api_view(['POST'])
@permission_classes([AllowAny])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return _auth_response(user, status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return _auth_response(serializer.validated_data['user'])


@api_view(['POST'])
def logout(request):
    request.auth.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PATCH'])
def me(request):
    profile_for(request.user)
    if request.method == 'GET':
        return Response(MeSerializer(request.user).data)

    serializer = MeSerializer(request.user, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(MeSerializer(request.user).data)


@api_view(['POST'])
def dismiss_phone_prompt(request):
    profile = profile_for(request.user)
    profile.phone_prompt_dismissed_at = timezone.now()
    profile.save(update_fields=['phone_prompt_dismissed_at'])
    return Response(MeSerializer(request.user).data)
