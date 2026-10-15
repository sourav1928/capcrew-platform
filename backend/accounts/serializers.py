"""App serializers"""
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import OTP, Profile, Address


class OTPSerializer(serializers.ModelSerializer):
    """Serializer for OTP model"""
    class Meta:
        model = OTP
        fields = ['email', 'purpose', 'is_used', 'created_at', 'expires_at']
        read_only_fields = ['created_at', 'expires_at', 'is_used']


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile"""
    class Meta:
        model = Profile
        fields = [
            'phone', 'date_of_birth', 'gender', 'preferred_language',
            'marketing_consent', 'is_email_verified', 'is_phone_verified'
        ]


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user registration and profile"""
    profile = ProfileSerializer(read_only=True)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'password', 'password_confirm', 'profile'
        ]
        read_only_fields = ['id', 'profile']

    def validate(self, data):
        """Validate password confirmation"""
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        return data

    def create(self, validated_data):
        """Create user with profile"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')

        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()

        Profile.objects.create(user=user)
        return user


class SendOTPSerializer(serializers.Serializer):
    """Serializer for send OTP request"""
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(
        choices=['email_verification', 'password_reset', 'login_2fa', 'phone_verification'],
        default='email_verification'
    )


class VerifyOTPSerializer(serializers.Serializer):
    """Serializer for verify OTP request"""
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    purpose = serializers.ChoiceField(
        choices=['email_verification', 'password_reset', 'login_2fa', 'phone_verification'],
        default='email_verification'
    )


class RegisterSerializer(serializers.Serializer):
    """Serializer for user registration"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    otp = serializers.CharField(max_length=6, min_length=6)
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)


class AddressSerializer(serializers.ModelSerializer):
    """Serializer for user addresses"""
    class Meta:
        model = Address
        fields = [
            'id', 'address_type', 'full_name', 'phone',
            'line1', 'line2', 'city', 'state', 'postal_code',
            'country', 'is_default'
        ]

