// Mock OTP Service for testing without backend
// Replace this with real API once backend is ready

const mockOtpStorage: { [email: string]: { otp: string; expiry: number } } = {}

export const mockAuthApi = {
  // Mock: Send OTP
  async sendOtp(email: string) {
    console.log('📧 Mock: Sending OTP to', email)

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP for 10 minutes
    mockOtpStorage[email] = {
      otp,
      expiry: Date.now() + 10 * 60 * 1000,
    }

    // Log OTP to console for testing
    console.log(`🔐 OTP for ${email}: ${otp}`)
    console.log('📋 Open browser console to see OTP')

    // Show alert in browser
    alert(`✅ OTP sent!\n\nFor testing:\nOTP: ${otp}\n\n(Also check console)`)

    return {
      success: true,
      message: 'OTP sent successfully',
      email,
      otp_expiry: 600, // 10 minutes
    }
  },

  // Mock: Verify OTP
  async verifyOtp(email: string, otp: string) {
    console.log('✓ Mock: Verifying OTP for', email)

    const stored = mockOtpStorage[email]

    if (!stored) {
      throw { message: 'No OTP found for this email. Please send OTP first.' }
    }

    if (Date.now() > stored.expiry) {
      delete mockOtpStorage[email]
      throw { message: 'OTP expired. Please request a new one.' }
    }

    if (stored.otp !== otp) {
      throw { message: 'Invalid OTP. Please try again.' }
    }

    // OTP verified
    delete mockOtpStorage[email]
    return { success: true, message: 'OTP verified' }
  },

  // Mock: Register
  async register(email: string, username: string, password: string) {
    console.log('👤 Mock: Creating account for', email)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const mockUser = {
      id: 'user_' + Date.now(),
      email,
      username,
      first_name: username.split(' ')[0],
      last_name: username.split(' ')[1] || '',
    }

    const mockToken = 'mock_jwt_token_' + Date.now()

    console.log('✅ Account created:', mockUser)

    return {
      success: true,
      message: 'Account created successfully',
      user: mockUser,
      token: mockToken,
    }
  },

  // Mock: Login
  async login(email: string, password: string) {
    console.log('🔑 Mock: Login for', email)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800))

    const mockUser = {
      id: 'user_123',
      email,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
    }

    const mockToken = 'mock_jwt_token_' + Date.now()

    console.log('✅ Logged in:', mockUser)

    return {
      success: true,
      message: 'Login successful',
      user: mockUser,
      token: mockToken,
    }
  },

  // Mock: Logout
  async logout() {
    console.log('👋 Mock: Logout')
    return { success: true, message: 'Logged out' }
  },
}
