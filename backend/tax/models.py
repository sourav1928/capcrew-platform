"""
Tax app models
"""

from django.db import models
from core.models import TimeStampedModel


class TaxClass(TimeStampedModel):
    """Tax classification for products"""
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'Tax Classes'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class TaxRate(TimeStampedModel):
    """Tax rates by region and class"""
    tax_class = models.ForeignKey(TaxClass, on_delete=models.CASCADE, related_name='rates')
    country = models.CharField(max_length=2, default='IN')
    state = models.CharField(max_length=100, null=True, blank=True)
    rate_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    valid_from = models.DateField()
    valid_until = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['-valid_from']
        unique_together = ('tax_class', 'country', 'state', 'valid_from')
        indexes = [
            models.Index(fields=['tax_class']),
            models.Index(fields=['country']),
        ]

    def __str__(self):
        state_str = f" - {self.state}" if self.state else ""
        return f"{self.tax_class.code} {self.rate_percentage}% ({self.country}{state_str})"
