from django.contrib import admin

from .models import StoreConfig


@admin.register(StoreConfig)
class StoreConfigAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not StoreConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

