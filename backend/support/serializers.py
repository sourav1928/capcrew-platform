"""App serializers"""
from rest_framework import serializers


class ContactMessageSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    subject = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    message = serializers.CharField(min_length=10, max_length=3000)
    # Hidden "honeypot" field: real visitors never fill it, spam bots usually do.
    website = serializers.CharField(required=False, allow_blank=True, default='')
