@echo off
REM Test script for Phase 4

echo.
echo ========================================
echo Testing E-Commerce Platform API
echo ========================================
echo.

echo Test 1: Health Check
curl http://localhost:8001/api/v1/health/
echo.
echo.

echo Test 2: Categories
curl http://localhost:8001/api/v1/catalog/categories/
echo.
echo.

echo Test 3: Products
curl http://localhost:8001/api/v1/catalog/products/
echo.
echo.

echo Test 4: Orders (no auth needed yet)
curl http://localhost:8001/api/v1/orders/
echo.
echo.

echo ========================================
echo Tests Complete!
echo ========================================
echo.
