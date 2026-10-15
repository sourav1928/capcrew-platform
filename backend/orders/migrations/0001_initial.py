# Generated migration for orders app

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('catalog', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order_number', models.CharField(db_index=True, max_length=50, unique=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('confirmed', 'Confirmed'), ('processing', 'Processing'), ('shipped', 'Shipped'), ('delivered', 'Delivered'), ('cancelled', 'Cancelled'), ('return_requested', 'Return Requested'), ('returned', 'Returned')], db_index=True, default='pending', max_length=20)),
                ('payment_status', models.CharField(choices=[('pending', 'Pending'), ('authorized', 'Authorized'), ('paid', 'Paid'), ('failed', 'Failed'), ('refunded', 'Refunded'), ('partially_refunded', 'Partially Refunded')], default='pending', max_length=20)),
                ('fulfillment_status', models.CharField(choices=[('pending', 'Pending'), ('picking', 'Picking'), ('packing', 'Packing'), ('shipped', 'Shipped'), ('delivered', 'Delivered'), ('failed', 'Failed')], default='pending', max_length=20)),
                ('total_items', models.PositiveIntegerField(default=0)),
                ('subtotal', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('discount_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('tax_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('shipping_cost', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('order_total', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('shipping_method', models.CharField(blank=True, max_length=100)),
                ('notes', models.TextField(blank=True)),
                ('confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='orders', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='OrderStatusHistory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('old_status', models.CharField(blank=True, max_length=20, null=True)),
                ('new_status', models.CharField(max_length=20)),
                ('reason', models.CharField(blank=True, max_length=255)),
                ('notes', models.TextField(blank=True)),
                ('changed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='status_history', to='orders.order')),
            ],
            options={
                'verbose_name_plural': 'Order Status Histories',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='OrderItem',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product_name', models.CharField(max_length=255)),
                ('variant_name', models.CharField(blank=True, max_length=255)),
                ('sku_code', models.CharField(max_length=100)),
                ('quantity', models.PositiveIntegerField()),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('discount_per_item', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('tax_per_item', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('line_total', models.DecimalField(decimal_places=2, max_digits=10)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='orders.order')),
                ('sku', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='catalog.sku')),
            ],
            options={
                'ordering': ['order', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='OrderAddress',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('address_type', models.CharField(choices=[('billing', 'Billing'), ('shipping', 'Shipping')], max_length=10)),
                ('full_name', models.CharField(max_length=255)),
                ('phone', models.CharField(max_length=20)),
                ('line1', models.CharField(max_length=255)),
                ('line2', models.CharField(blank=True, max_length=255)),
                ('city', models.CharField(max_length=100)),
                ('state', models.CharField(max_length=100)),
                ('postal_code', models.CharField(max_length=20)),
                ('country', models.CharField(default='IN', max_length=2)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='addresses', to='orders.order')),
            ],
            options={
                'ordering': ['address_type'],
            },
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['order_number'], name='orders_orde_order_n_a1b2c3_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['user'], name='orders_orde_user_id_d4e5f6_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['status'], name='orders_orde_status_g7h8i9_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['payment_status'], name='orders_orde_payment_j0k1l2_idx'),
        ),
        migrations.AddIndex(
            model_name='order',
            index=models.Index(fields=['created_at'], name='orders_orde_created_m3n4o5_idx'),
        ),
        migrations.AddIndex(
            model_name='orderstatushistory',
            index=models.Index(fields=['order'], name='orders_orde_order_id_p6q7r8_idx'),
        ),
        migrations.AddIndex(
            model_name='orderstatushistory',
            index=models.Index(fields=['created_at'], name='orders_orde_created_s9t0u1_idx'),
        ),
        migrations.AddIndex(
            model_name='orderitem',
            index=models.Index(fields=['order'], name='orders_orde_order_id_v2w3x4_idx'),
        ),
        migrations.AddIndex(
            model_name='orderitem',
            index=models.Index(fields=['sku'], name='orders_orde_sku_id_y5z6a7_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='orderaddress',
            unique_together={('order', 'address_type')},
        ),
    ]
