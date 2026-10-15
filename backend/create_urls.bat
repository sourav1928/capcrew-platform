@echo off
setlocal enabledelayedexpansion

set apps=accounts analytics cart catalog checkout cms compliance coupons inventory invoicing notifications orders payments promotions refunds returns reviews shipping support tax warranty wishlist

for %%a in (%apps%) do (
    (
        echo """%%a app URLs"""
        echo from django.urls import path
        echo.
        echo urlpatterns = []
    ) > %%a\urls.py
    echo Created %%a\urls.py
)

echo.
echo All urls.py files created!
pause