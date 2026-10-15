#!/bin/bash

# Create app structure for all domain apps
APPS="accounts inventory cart wishlist checkout orders payments shipping returns refunds warranty reviews coupons promotions cms support notifications compliance tax invoicing analytics"

for app in $APPS; do
    mkdir -p /sessions/awesome-eager-hopper/mnt/outputs/backend/$app
    
    # Create __init__.py
    touch /sessions/awesome-eager-hopper/mnt/outputs/backend/$app/__init__.py
    
    # Create basic app files
    cat > /sessions/awesome-eager-hopper/mnt/outputs/backend/$app/apps.py << APPFILE
"""${app^} app configuration"""
from django.apps import AppConfig

class ${app^}Config(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = '${app}'
    verbose_name = '${app^}'
APPFILE

    cat > /sessions/awesome-eager-hopper/mnt/outputs/backend/$app/models.py << 'MODFILE'
"""App models"""
from core.models import TimeStampedModel

# Models to be implemented
MODFILE

    cat > /sessions/awesome-eager-hopper/mnt/outputs/backend/$app/views.py << 'VIEWFILE'
"""App views"""
from rest_framework import viewsets

# Views to be implemented
VIEWFILE

    cat > /sessions/awesome-eager-hopper/mnt/outputs/backend/$app/serializers.py << 'SERFILE'
"""App serializers"""
from rest_framework import serializers

# Serializers to be implemented
SERFILE

    cat > /sessions/awesome-eager-hopper/mnt/outputs/backend/$app/urls.py << 'URLFILE'
"""App URLs"""
from django.urls import path

urlpatterns = []
URLFILE

    cat > /sessions/awesome-eager-hopper/mnt/outputs/backend/$app/admin.py << 'ADMINFILE'
"""Admin configuration"""
from django.contrib import admin

# Admin to be implemented
ADMINFILE

    cat > /sessions/awesome-eager-hopper/mnt/outputs/backend/$app/tests.py << 'TESTFILE'
"""Tests"""
from django.test import TestCase

# Tests to be implemented
TESTFILE
done

echo "✅ All app stubs created!"
