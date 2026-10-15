"""
CMS app models
"""

from django.db import models
from core.models import TimeStampedModel, ActiveManager


class CMSPage(TimeStampedModel):
    """CMS pages"""
    slug = models.SlugField(unique=True, max_length=255, db_index=True)
    title = models.CharField(max_length=255)
    content = models.TextField()
    meta_description = models.CharField(max_length=255, blank=True)
    meta_keywords = models.CharField(max_length=255, blank=True)
    is_published = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name_plural = 'CMS Pages'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_published']),
        ]

    def __str__(self):
        return self.title


class CMSBanner(TimeStampedModel):
    """Homepage banners"""
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    image_url = models.URLField()
    link_url = models.CharField(max_length=300, blank=True, null=True)
    button_text = models.CharField(max_length=40, blank=True, default='Shop now')
    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveIntegerField(default=0)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['display_order', '-created_at']
        verbose_name_plural = 'CMS Banners'

    def __str__(self):
        return self.title


class CMSFAQ(TimeStampedModel):
    """FAQs"""
    question = models.CharField(max_length=255)
    answer = models.TextField()
    category = models.CharField(max_length=100, db_index=True)
    display_order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name_plural = 'FAQs'
        ordering = ['category', 'display_order']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['is_published']),
        ]

    def __str__(self):
        return self.question


class CMSContent(TimeStampedModel):
    """Flexible CMS content"""
    CONTENT_TYPES = [
        ('text', 'Text'),
        ('json', 'JSON'),
        ('html', 'HTML'),
    ]

    key = models.CharField(max_length=255, unique=True, db_index=True)
    content = models.TextField()
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, default='text')

    class Meta:
        verbose_name_plural = 'CMS Content'
        ordering = ['key']

    def __str__(self):
        return self.key
