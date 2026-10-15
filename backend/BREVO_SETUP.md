# Brevo Email Integration Setup Guide

## Overview
This guide explains how to set up **Brevo** (formerly Sendinblue) for sending OTP codes, transactional emails, and notifications in the CapCrew e-commerce platform.

## What is Brevo?
Brevo is a cloud-based email marketing and SMS platform that provides:
- Email sending APIs
- Transactional email templates
- SMTP relay
- Email verification
- Advanced reporting

## Step 1: Create a Brevo Account

1. Go to [https://www.brevo.com](https://www.brevo.com)
2. Click **"Sign up"** and create your account
3. Verify your email address
4. Complete the profile setup

## Step 2: Get Your API Key

1. Log in to your Brevo dashboard
2. Go to **Settings** → **Keys & API**
3. Click **"Create a new API key"**
4. Name it (e.g., "CapCrew API")
5. Copy the API key (keep it secret!)

## Step 3: Verify Sender Email

Before sending emails, you need to verify your sender email address:

1. In Brevo dashboard, go to **Senders & Domains**
2. Click **"Add a new sender"**
3. Enter your business email
4. Verify the email (you'll receive a confirmation link)

## Step 4: Configure Backend

1. **Copy `.env.example` to `.env`:**
   ```bash
   cp .env.example .env
   ```

2. **Update your `.env` file:**
   ```env
   BREVO_API_KEY=your-api-key-from-step-2
   BREVO_ENABLED=True
   DEFAULT_FROM_EMAIL=your-verified-email@yourcompany.com
   BUSINESS_EMAIL=support@yourcompany.com
   BUSINESS_NAME=CapCrew
   ```

3. **Install required package (if not already installed):**
   ```bash
   pip install requests
   ```

## Step 5: Run Migrations

Create and apply the OTP model migration:

```bash
# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Create migrations for accounts app
python manage.py makemigrations accounts

# Apply migrations
python manage.py migrate accounts
```

## Step 6: Test the Integration

### Test OTP Sending

```bash
python manage.py shell
```

```python
from core.email_service import brevo_service

# Send test OTP
result = brevo_service.send_otp_email(
    email='test@example.com',
    otp='123456',
    user_name='Test User'
)
print(result)
```

Expected output:
```
{'success': True, 'message': 'OTP sent successfully'}
```

### Test via API

1. Start your Django server:
   ```bash
   python manage.py runserver
   ```

2. Send OTP request via cURL or Postman:
   ```bash
   curl -X POST http://localhost:8001/api/v1/auth/send-otp/ \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "purpose": "email_verification"
     }'
   ```

3. Expected response:
   ```json
   {
     "success": true,
     "message": "OTP sent to your email",
     "data": {
       "email": "user@example.com",
       "purpose": "email_verification",
       "expires_in_minutes": 5
     }
   }
   ```

## API Endpoints

### 1. Send OTP
**POST** `/api/v1/auth/send-otp/`

Request:
```json
{
  "email": "user@example.com",
  "purpose": "email_verification"
}
```

Response:
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "data": {
    "email": "user@example.com",
    "purpose": "email_verification",
    "expires_in_minutes": 5
  }
}
```

### 2. Verify OTP
**POST** `/api/v1/auth/verify-otp/`

Request:
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "purpose": "email_verification"
}
```

Response:
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "email": "user@example.com",
    "verified": true
  }
}
```

### 3. Register User
**POST** `/api/v1/auth/register/`

Request:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "otp": "123456",
  "first_name": "John",
  "last_name": "Doe"
}
```

Response:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "username": "user@example.com"
  }
}
```

## Email Templates

The system includes pre-built HTML email templates for:

1. **OTP Email** - For account verification
2. **Order Confirmation** - When order is placed
3. **Password Reset** - For password recovery

All templates include:
- Business branding
- Professional formatting
- Clear call-to-action
- Unsubscribe options (Brevo-managed)

## OTP Configuration

The following settings control OTP behavior (in `settings.py`):

```python
OTP_EXPIRY_MINUTES = 5           # OTP expires in 5 minutes
OTP_RESEND_LIMIT = 3             # Max 3 resend attempts
```

## Security Features

✅ **Implemented:**
- OTP codes are 6-digit random numbers
- Expiration after 5 minutes
- Single-use enforcement
- IP address and user-agent logging
- Rate limiting (via Brevo)
- HTTPS encryption in transit
- API key stored in environment variables

## Troubleshooting

### Issue: "Brevo API key not configured"
**Solution:** Ensure `BREVO_API_KEY` is set in your `.env` file and the server has been restarted.

### Issue: "Failed to send OTP email"
**Solutions:**
1. Verify API key is correct
2. Ensure sender email is verified in Brevo
3. Check Brevo account doesn't have sending restrictions
4. Verify network connectivity to `api.brevo.com`

### Issue: "Email already registered"
**Solution:** This is expected for duplicate email addresses. Use a different email or reset the password.

### Issue: "OTP has expired"
**Solution:** Request a new OTP. Default expiration is 5 minutes.

## Monitoring & Logging

All email sending is logged to help debug issues:

```python
# View logs in Django console or log files
logger.info(f"✅ OTP sent successfully to {email}")
logger.error(f"❌ Failed to send OTP: {error}")
```

Check logs at: `backend/logs/django.log`

## Production Checklist

- [ ] Brevo account created and verified
- [ ] API key securely stored in environment variables
- [ ] Sender email address verified in Brevo
- [ ] Database migrations applied
- [ ] Email templates customized with your branding
- [ ] Rate limiting configured appropriately
- [ ] Logging enabled and monitored
- [ ] Backup email service configured (if available)
- [ ] Test emails sent successfully
- [ ] CORS and CSRF settings updated for production domain

## Next Steps

1. Update frontend `.env.local` to use the OTP endpoints:
   ```
   VITE_API_URL=http://localhost:8001/api/v1
   ```

2. Update RegisterPage.tsx to call:
   - `/api/v1/auth/send-otp/` - Send OTP
   - `/api/v1/auth/verify-otp/` - Verify OTP
   - `/api/v1/auth/register/` - Complete registration

3. Add error handling for:
   - Network failures
   - Brevo API rate limits
   - Invalid/expired OTPs

## Support

For Brevo support, visit: [https://help.brevo.com](https://help.brevo.com)

For platform support, contact: support@capcrew.local
