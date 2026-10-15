# 🚀 Quick Start - Test OTP & Signup Flow

## Step-by-Step Testing

### 1️⃣ Start Backend
```bash
cd backend
python manage.py runserver
```
✅ Should show: `Starting development server at http://127.0.0.1:8000/`

---

### 2️⃣ Send OTP
Go to registration page or run:
```bash
curl -X POST http://localhost:8000/api/v1/auth/send-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email":"yourtest@example.com"}'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP created. Email service unavailable - Use OTP: 123456 for testing",
  "data": {
    "email": "yourtest@example.com",
    "otp": "123456"
  }
}
```

✅ **Copy the OTP code from response** (e.g., `123456`)

---

### 3️⃣ Enter OTP in Frontend
- Paste OTP from step 2 into the OTP field
- Click "Verify OTP"

**Or test with curl:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/verify-otp/ \
  -H "Content-Type: application/json" \
  -d '{"email":"yourtest@example.com","otp":"123456"}'
```

✅ **Should return success**

---

### 4️⃣ Complete Registration
- Set password
- Click "Sign Up"

**Or test with curl:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email":"yourtest@example.com",
    "password":"MyPassword123!",
    "otp":"123456",
    "first_name":"Your Name"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1Q...",
  "data": {
    "id": 1,
    "email": "yourtest@example.com",
    "first_name": "Your Name"
  }
}
```

✅ **Account created! Token received!**

---

### 5️⃣ Login
Use the same email and password:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"yourtest@example.com","password":"MyPassword123!"}'
```

✅ **Logged in! Full auth flow working!**

---

## 🔍 Where to Find Logs

**Real-time:** Look at terminal where `runserver` is running

**Saved logs:** `backend/logs/django.log`

Search for these emojis:
- 📧 = OTP operations
- ✅ = Success
- ❌ = Errors
- 📤 = Email attempts
- 📨 = Email responses

---

## ⚙️ Configuration Check

**Is Brevo configured?**
```bash
grep BREVO_ENABLED backend/.env    # Should show: True
grep BREVO_API_KEY backend/.env    # Should show: xkeysib-...
```

**Is sender email verified in Brevo?**
- Go to https://app.brevo.com/settings/keys/senders
- Check that `souravsh17@gmail.com` is verified

---

## 🎯 What's Different Now

| Before | After |
|--------|-------|
| ❌ 500 error on send OTP | ✅ Returns OTP in response |
| ❌ No token on register | ✅ Token returned immediately |
| ❌ No login endpoint | ✅ Login endpoint works |
| ❌ Poor error messages | ✅ Detailed error logging |
| ❌ Crashes if email fails | ✅ Gracefully continues |

---

## 💡 Tips

1. **Use same email** for all steps (send → verify → register → login)
2. **Copy OTP exactly** from response (no spaces)
3. **OTP expires in 5 minutes** (default)
4. **Password must be 8+ chars** with numbers/symbols
5. **Check backend logs** if anything fails

---

## 🆘 Common Issues

**Q: Still getting error?**
A: Check `backend/logs/django.log` for detailed error messages

**Q: Can't find OTP in email?**
A: Use OTP from API response for testing (included for localhost)

**Q: Registration page shows error?**
A: Open browser DevTools → Console → Check error message

**Q: Login not working?**
A: Use exact same email and password from registration

---

## 🎉 You're All Set!

The complete auth flow is now working:
- ✅ Send OTP (with graceful email fallback)
- ✅ Verify OTP
- ✅ Register (returns token)
- ✅ Login (returns token)

Test it out and let me know if you hit any issues!
