import axios, { AxiosInstance } from 'axios'

// @ts-ignore
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1'

console.log('🔗 API Base URL:', API_BASE_URL)

interface SendOtpResponse {
  success: boolean
  message: string
  email: string
  otp_expiry: number
}

interface RegisterResponse {
  success: boolean
  message: string
  user: {
    id: string
    email: string
    username: string
    first_name?: string
    last_name?: string
  }
  token: string
}

interface LoginResponse {
  success: boolean
  message: string
  user: {
    id: string
    email: string
    username: string
    first_name?: string
    last_name?: string
  }
  token: string
}

interface LogoutResponse {
  success: boolean
  message: string
}

class AuthApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Handle response errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message)
        return Promise.reject(error)
      }
    )
  }

  // Send OTP to email
  async sendOtp(email: string): Promise<SendOtpResponse> {
    try {
      console.log('📧 Sending OTP to:', email)
      const response = await this.client.post('/auth/send-otp/', {
        email,
        purpose: 'email_verification'
      })
      console.log('✅ OTP sent successfully')
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to send OTP'
      console.error('❌ Send OTP Error:', message)
      throw {
        success: false,
        message,
        details: error.response?.data,
      }
    }
  }

  // Verify OTP and complete registration
  async verifyOtpAndRegister(
    email: string,
    otp: string,
    password: string,
    username: string
  ): Promise<RegisterResponse> {
    try {
      console.log('🔐 Verifying OTP and registering user:', email)
      const response = await this.client.post('/auth/register/', {
        email,
        otp,
        password,
        first_name: username,
      })
      console.log('✅ Registration successful')

      // Store token if provided
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token)
        console.log('🔑 Token stored')
      }

      // Backend returns the user under `data`; expose it as `user` too
      return { ...response.data, user: response.data.user ?? response.data.data }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to register'
      console.error('❌ Registration Error:', message)
      throw {
        success: false,
        message,
        details: error.response?.data,
      }
    }
  }

  // Login with email and password
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('🔑 Logging in:', email)
      const response = await this.client.post('/auth/login/', {
        email,
        password,
      })
      console.log('✅ Login successful')

      // Store token if provided
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token)
        console.log('🔑 Token stored')
      }

      // Backend returns the user under `data`; expose it as `user` too
      return { ...response.data, user: response.data.user ?? response.data.data }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed'
      console.error('❌ Login Error:', message)
      throw {
        success: false,
        message,
        details: error.response?.data,
      }
    }
  }

  // Logout
  async logout(): Promise<LogoutResponse> {
    try {
      console.log('👋 Logging out')
      const response = await this.client.post('/auth/logout')
      localStorage.removeItem('authToken')
      console.log('✅ Logged out')
      return response.data
    } catch (error: any) {
      // Still remove token even if request fails
      localStorage.removeItem('authToken')
      console.error('⚠️ Logout error (token cleared anyway)')
      return { success: true, message: 'Logged out' }
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const response = await this.client.get('/auth/me')
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to get user'
      throw {
        success: false,
        message,
        details: error.response?.data,
      }
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken')
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem('authToken')
  }

  // Clear token
  clearToken(): void {
    localStorage.removeItem('authToken')
  }
}

export const authApi = new AuthApiClient()