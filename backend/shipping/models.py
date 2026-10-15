"""
Shipping app models
"""

from django.db import models
from core.models import TimeStampedModel


class Shipment(TimeStampedModel):
    """Shipments"""
    SHIPMENT_STATUS = [
        ('created', 'Created'),
        ('picked_up', 'Picked Up'),
        ('in_transit', 'In Transit'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('ndr', 'No Delivery Reason (NDR)'),
        ('rto', 'Return to Origin (RTO)'),
        ('cancelled', 'Cancelled'),
    ]

    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='shipment'
    )
    tracking_number = models.CharField(max_length=100, unique=True, db_index=True)
    tracking_url = models.CharField(max_length=300, blank=True, default='')
    courier_provider = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=SHIPMENT_STATUS, default='created', db_index=True)
    estimated_delivery = models.DateField(null=True, blank=True)
    actual_delivery = models.DateField(null=True, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['tracking_number']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Shipment {self.tracking_number}"


class ShipmentTrackingEvent(TimeStampedModel):
    """Tracking events for shipments"""
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='tracking_events')
    status = models.CharField(max_length=50)
    location = models.CharField(max_length=255, blank=True)
    event_date = models.DateTimeField()
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-event_date']
        verbose_name_plural = 'Shipment Tracking Events'

    def __str__(self):
        return f"{self.shipment.tracking_number} - {self.status}"
