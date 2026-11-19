import re

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='first_name')

    class Meta:
        model = User
        fields = ['id', 'email', 'name']


class MeSerializer(serializers.Serializer):
    """The signed-in user's own account, including private profile fields."""

    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    name = serializers.CharField(source='first_name', max_length=150)
    phone = serializers.CharField(source='profile.phone', max_length=20, allow_blank=True, required=False)
    show_phone_prompt = serializers.BooleanField(source='profile.should_prompt_for_phone', read_only=True)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Name cannot be empty.')
        return value

    def validate_phone(self, value):
        if not value.strip():
            return ''
        # Accept spaces, dashes, dots and brackets as people type them; store +digits.
        cleaned = re.sub(r'[\s\-().]', '', value.strip())
        if not re.fullmatch(r'\+?\d{7,15}', cleaned):
            raise serializers.ValidationError('Enter a valid phone number, e.g. +234 801 234 5678.')
        return cleaned

    def update(self, user, validated_data):
        if 'first_name' in validated_data:
            user.first_name = validated_data['first_name']
            user.save(update_fields=['first_name'])
        if 'phone' in validated_data.get('profile', {}):
            user.profile.phone = validated_data['profile']['phone']
            user.profile.save(update_fields=['phone'])
        return user


class SignupSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate(self, attrs):
        candidate = User(username=attrs['email'], email=attrs['email'], first_name=attrs['name'])
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as e:
            # Attach to the password field so the form can show it under the input.
            raise serializers.ValidationError({'password': list(e.messages)})
        return attrs

    def create(self, validated_data):
        # Email doubles as the username so people log in with their email.
        return User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            first_name=validated_data['name'].strip(),
            password=validated_data['password'],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs['email'].strip().lower(), password=attrs['password'])
        if user is None:
            raise serializers.ValidationError('Invalid email or password.')
        attrs['user'] = user
        return attrs
