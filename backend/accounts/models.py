"""
Accounts app models for user management, authentication, and RBAC
"""

from django.db import models
from django.contrib.auth.models import User
from core.models import TimeStampedModel, SoftDeleteModel, ActiveManager
import uuid


class Profile(TimeStampedModel):
    """Extended user profile with additional information"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True, db_index=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other')],
        null=True,
        blank=True
    )
    preferred_language = models.CharField(max_length=10, default='en')
    marketing_consent = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f"Profile of {self.user.email}"


class Address(SoftDeleteModel):
    """User addresses for billing and shipping"""
    ADDRESS_TYPES = [
        ('billing', 'Billing'),
        ('shipping', 'Shipping'),
        ('both', 'Billing & Shipping'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    address_type = models.CharField(max_length=10, choices=ADDRESS_TYPES, default='both')
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    line1 = models.CharField(max_length=255, verbose_name='Address Line 1')
    line2 = models.CharField(max_length=255, blank=True, verbose_name='Address Line 2')
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=2, default='IN')  # ISO country code
    is_default = models.BooleanField(default=False)

    objects = ActiveManager()

    class Meta:
        ordering = ['-is_default', '-created_at']
        verbose_name_plural = 'Addresses'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['is_deleted']),
        ]

    def __str__(self):
        return f"{self.full_name}, {self.city} ({self.address_type})"


class Role(models.Model):
    """User roles for RBAC"""
    SYSTEM_ROLES = [
        'SUPER_ADMIN',
        'ADMIN',
        'PRODUCT_MANAGER',
        'ORDER_MANAGER',
        'INVENTORY_MANAGER',
        'CONTENT_MANAGER',
        'SUPPORT_AGENT',
        'FINANCE_MANAGER',
    ]

    name = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Permission(models.Model):
    """Permissions for roles"""
    PERMISSION_CHOICES = [
        ('product.create', 'Create Product'),
        ('product.edit', 'Edit Product'),
        ('product.delete', 'Delete Product'),
        ('product.view', 'View Product'),
        ('order.view', 'View Orders'),
        ('order.edit', 'Edit Orders'),
        ('order.cancel', 'Cancel Orders'),
        ('inventory.view', 'View Inventory'),
        ('inventory.edit', 'Edit Inventory'),
        ('payment.view', 'View Payments'),
        ('payment.refund', 'Process Refunds'),
        ('user.manage', 'Manage Users'),
        ('support.respond', 'Respond to Support'),
        ('analytics.view', 'View Analytics'),
        ('settings.manage', 'Manage Settings'),
    ]

    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='permissions')
    permission = models.CharField(max_length=100, choices=PERMISSION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('role', 'permission')
        ordering = ['permission']

    def __str__(self):
        return f"{self.role.name} - {self.permission}"


class UserRole(models.Model):
    """User role assignments"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_role')
    role = models.ForeignKey(Role, on_delete=models.PROTECT)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_roles'
    )

    class Meta:
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.role.name}"


class OTP(TimeStampedModel):
    """One-Time Password for email verification and 2FA"""
    PURPOSE_CHOICES = [
        ('email_verification', 'Email Verification'),
        ('password_reset', 'Password Reset'),
        ('login_2fa', 'Login 2FA'),
        ('phone_verification', 'Phone Verification'),
    ]

    email = models.EmailField(db_index=True)
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=50, choices=PURPOSE_CHOICES, default='email_verification')
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'otp_code']),
            models.Index(fields=['email', 'purpose']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"OTP for {self.email} ({self.purpose})"

    def is_valid(self):
        """Check if OTP is valid (not expired and not used)"""
        from django.utils import timezone
        return not self.is_used and self.expires_at > timezone.now()

    def mark_as_used(self):
        """Mark OTP as used"""
        from django.utils import timezone
        self.is_used = True
        self.used_at = timezone.now()
        self.save()


class Consent(TimeStampedModel):
    """Track user consents for privacy and marketing"""
    CONSENT_TYPES = [
        ('marketing_email', 'Marketing Email'),
        ('marketing_sms', 'Marketing SMS'),
        ('terms_accepted', 'Terms Accepted'),
        ('privacy_policy', 'Privacy Policy'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='consents')
    consent_type = models.CharField(max_length=50, choices=CONSENT_TYPES)
    is_accepted = models.BooleanField(default=False)
    version = models.IntegerField(default=1)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        unique_together = ('user', 'consent_type')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['consent_type']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.consent_type}"