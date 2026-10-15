# Quick Reference - Auth Flow Testing

## 🚀 Start the Backend
```bash
cd backend
python manage.py runserver
# Should show: Starting development server at http://127.0.0.1:8000/
```

## 🧪 Test the Complete Flow

### 1️⃣ Send OTP (Get code from logs)
```bash
curl -X POST http://localhost:8000/api/v1/auth/send-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```
**Check backend console** for: `📧 OTP 123456 created for test@example.com`

### 2️⃣ Verify OTP (Use code from logs)
```bash
curl -X POST http://localhost:8000/api/v1/auth/verify-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

### 3️⃣ Register (Signup)
```bash
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"Test@Pass123",
    "otp":"123456",
    "first_name":"Test"
  }'
```
**Response includes**: `"token": "eyJ0eXAi..."`

### 4️⃣ Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@Pass123"}'
```
**Response includes**: `"token": "eyJ0eXAi..."`

---

## 📋 What Was Fixed

| Issue | Fix | Status |
|-------|-----|--------|
| Logger not outputting | Added `accounts` logger to LOGGING config | ✅ |
| No login endpoint | Created `LoginView` class | ✅ |
| No token on signup | Added JWT token to register response | ✅ |
| Email issues | Already working - resilient design | ✅ |

---

## 📁 Files Modified

1. **backend/config/settings.py**
   - Added accounts & core loggers

2. **backend/accounts/views.py**
   - Added LoginView class
   - Updated RegisterView to return token

3. **backend/accounts/urls.py**
   - Added login/ endpoint

---

## 🔍 View Logs

**Console**: Look at terminal where `runserver` is running

**File**: `backend/logs/django.log`

Search for these emojis to track flow:
- 📧 = OTP created
- ✅ = Success operations
- ❌ = Errors/failures
- ⚠️ = Warnings

---

## 🎯 Frontend Testing

Run frontend in another terminal:
```bash
cd frontend
npm run dev
# Visit http://localhost:5173
```

The signup/login flow should now work end-to-end! 🎉
