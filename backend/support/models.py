"""
Support app models
"""

from django.db import models
from django.contrib.auth.models import User
from core.models import TimeStampedModel


class SupportTicket(TimeStampedModel):
    """Customer support tickets"""
    TICKET_CATEGORIES = [
        ('general', 'General'),
        ('order', 'Order'),
        ('product', 'Product'),
        ('payment', 'Payment'),
        ('shipping', 'Shipping'),
        ('return', 'Return'),
        ('warranty', 'Warranty'),
    ]

    TICKET_PRIORITY = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    TICKET_STATUS = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('waiting_customer', 'Waiting Customer'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]

    ticket_number = models.CharField(max_length=50, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_tickets')
    category = models.CharField(max_length=20, choices=TICKET_CATEGORIES)
    priority = models.CharField(max_length=20, choices=TICKET_PRIORITY, default='medium')
    status = models.CharField(max_length=20, choices=TICKET_STATUS, default='open', db_index=True)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['ticket_number']),
            models.Index(fields=['user']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Ticket {self.ticket_number}"


class SupportMessage(TimeStampedModel):
    """Messages in support tickets"""
    SENDER_TYPES = [
        ('customer', 'Customer'),
        ('agent', 'Agent'),
    ]

    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    sender_type = models.CharField(max_length=20, choices=SENDER_TYPES)
    message = models.TextField()
    is_internal = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['ticket']),
        ]

    def __str__(self):
        return f"Message in {self.ticket.ticket_number}"


class SupportAttachment(TimeStampedModel):
    """Attachments in support messages"""
    message = models.ForeignKey(SupportMessage, on_delete=models.CASCADE, related_name='attachments')
    file_url = models.URLField()
    file_type = models.CharField(max_length=50)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Attachment {self.id}"


class ContactMessage(TimeStampedModel):
    """A message sent from the public Contact page (no login needed)."""
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=150, blank=True)
    message = models.TextField(max_length=3000)
    is_handled = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} <{self.email}> - {self.subject or 'No subject'}"
