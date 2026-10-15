"""
Email service using Brevo (formerly Sendinblue)
Handles OTP, transactional, and marketing emails
"""

import logging
import os
from typing import Dict, List, Optional
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class BrevoEmailService:
    """
    Email service integration with Brevo API
    Handles OTP, transactional, and bulk emails
    """

    BASE_URL = "https://api.brevo.com/v3"

    def __init__(self):
        """Initialize Brevo service with API key"""
        self.api_key = settings.BREVO_API_KEY
        if not self.api_key:
            logger.warning("⚠️ BREVO_API_KEY not configured. Email service disabled.")

        self.headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": self.api_key,
        }

    def send_otp_email(self, email: str, otp: str, user_name: str = "User") -> Dict:
        """
        Send OTP email via Brevo

        Args:
            email: Recipient email
            otp: One-time password code
            user_name: User's name for personalization

        Returns:
            Dict with success status and message
        """
        if not self.api_key:
            logger.warning("⚠️ BREVO_API_KEY not configured. Cannot send OTP email.")
            return {"success": False, "message": "Brevo API key not configured"}

        try:
            subject = "Your OTP for CapCrew Registration"

            email_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0066cc;">Welcome to CapCrew!</h2>

                    <p>Hi {user_name},</p>

                    <p>Here's your One-Time Password (OTP) for account verification:</p>

                    <div style="background-color: #f0f0f0; padding: 15px; text-align: center; margin: 20px 0; border-radius: 5px;">
                        <h1 style="color: #0066cc; margin: 0; letter-spacing: 2px;">{otp}</h1>
                    </div>

                    <p style="color: #666;">
                        <strong>⏰ This OTP will expire in {settings.OTP_EXPIRY_MINUTES} minutes.</strong>
                    </p>

                    <p>If you didn't request this code, please ignore this email or contact support.</p>

                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

                    <p style="color: #999; font-size: 12px;">
                        <strong>CapCrew Support Team</strong><br>
                        {settings.BUSINESS_EMAIL}
                    </p>
                </div>
            </body>
            </html>
            """

            payload = {
                "sender": {
                    "name": settings.BUSINESS_NAME,
                    "email": settings.DEFAULT_FROM_EMAIL,
                },
                "to": [{"email": email, "name": user_name}],
                "subject": subject,
                "htmlContent": email_body,
            }

            logger.info(f"📤 Attempting to send OTP email to {email} via Brevo...")

            response = requests.post(
                f"{self.BASE_URL}/smtp/email",
                json=payload,
                headers=self.headers,
                timeout=10
            )

            logger.info(f"📨 Brevo response status: {response.status_code}")

            if response.status_code in [200, 201]:
                logger.info(f"✅ OTP email sent to {email}")
                return {"success": True, "message": "OTP sent successfully"}
            else:
                error_msg = response.text
                logger.error(f"❌ Brevo API returned {response.status_code}: {error_msg}")
                return {
                    "success": False,
                    "message": f"Brevo API error: {response.status_code}",
                    "error": error_msg
                }

        except requests.exceptions.ConnectionError as e:
            logger.error(f"❌ Connection error connecting to Brevo: {str(e)}")
            return {
                "success": False,
                "message": "Connection error - Brevo API unreachable",
                "error": str(e)
            }
        except requests.exceptions.Timeout as e:
            logger.error(f"❌ Timeout connecting to Brevo: {str(e)}")
            return {
                "success": False,
                "message": "Timeout - Brevo API took too long to respond",
                "error": str(e)
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Request error with Brevo API: {str(e)}")
            return {
                "success": False,
                "message": f"Request error: {str(e)}",
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"❌ Unexpected error sending OTP: {str(e)}", exc_info=True)
            return {
                "success": False,
                "message": f"Unexpected error: {str(e)}",
                "error": str(e)
            }

    def send_order_confirmation(self, email: str, order_id: str, user_name: str = "User") -> Dict:
        """
        Send order confirmation email

        Args:
            email: Recipient email
            order_id: Order ID for reference
            user_name: User's name

        Returns:
            Dict with success status
        """
        if not self.api_key:
            return {"success": False, "message": "Brevo API key not configured"}

        try:
            subject = f"Order Confirmed - #{order_id}"

            email_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0066cc;">Order Confirmed!</h2>

                    <p>Hi {user_name},</p>

                    <p>Thank you for your order! We've received it and will process it soon.</p>

                    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Order ID:</strong> {order_id}</p>
                    </div>

                    <p>You can track your order status anytime in your account dashboard.</p>

                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

                    <p style="color: #999; font-size: 12px;">
                        <strong>CapCrew Support Team</strong><br>
                        {settings.BUSINESS_EMAIL}
                    </p>
                </div>
            </body>
            </html>
            """

            payload = {
                "sender": {
                    "name": settings.BUSINESS_NAME,
                    "email": settings.DEFAULT_FROM_EMAIL,
                },
                "to": [{"email": email, "name": user_name}],
                "subject": subject,
                "htmlContent": email_body,
            }

            response = requests.post(
                f"{self.BASE_URL}/smtp/email",
                json=payload,
                headers=self.headers,
                timeout=10
            )

            if response.status_code in [200, 201]:
                logger.info(f"✅ Order confirmation sent to {email}")
                return {"success": True, "message": "Order confirmation sent"}
            else:
                logger.error(f"❌ Failed to send order confirmation: {response.text}")
                return {"success": False, "message": "Failed to send confirmation"}

        except Exception as e:
            logger.error(f"❌ Error sending order confirmation: {str(e)}")
            return {"success": False, "message": str(e)}

    def send_password_reset(self, email: str, reset_link: str, user_name: str = "User") -> Dict:
        """
        Send password reset email

        Args:
            email: Recipient email
            reset_link: Password reset link
            user_name: User's name

        Returns:
            Dict with success status
        """
        if not self.api_key:
            return {"success": False, "message": "Brevo API key not configured"}

        try:
            subject = "Reset Your CapCrew Password"

            email_body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #0066cc;">Password Reset Request</h2>

                    <p>Hi {user_name},</p>

                    <p>We received a request to reset your password. Click the button below to proceed:</p>

                    <div style="text-align: center; margin: 20px 0;">
                        <a href="{reset_link}" style="background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>

                    <p style="color: #666;">This link will expire in 24 hours.</p>

                    <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>

                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

                    <p style="color: #999; font-size: 12px;">
                        <strong>CapCrew Support Team</strong><br>
                        {settings.BUSINESS_EMAIL}
                    </p>
                </div>
            </body>
            </html>
            """

            payload = {
                "sender": {
                    "name": settings.BUSINESS_NAME,
                    "email": settings.DEFAULT_FROM_EMAIL,
                },
                "to": [{"email": email, "name": user_name}],
                "subject": subject,
                "htmlContent": email_body,
            }

            response = requests.post(
                f"{self.BASE_URL}/smtp/email",
                json=payload,
                headers=self.headers,
                timeout=10
            )

            if response.status_code in [200, 201]:
                logger.info(f"✅ Password reset email sent to {email}")
                return {"success": True, "message": "Password reset email sent"}
            else:
                return {"success": False, "message": "Failed to send reset email"}

        except Exception as e:
            logger.error(f"❌ Error sending password reset: {str(e)}")
            return {"success": False, "message": str(e)}


# Global instance
brevo_service = BrevoEmailService()
