import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface User {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  avatar?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('authToken'),
  isAuthenticated: !!localStorage.getItem('authToken'),
  isLoading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    login: (state, action: PayloadAction<{ user: User; token: string; isAuthenticated: boolean }>) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = action.payload.isAuthenticated
      state.error = null
      state.isLoading = false
      localStorage.setItem('authToken', action.payload.token)
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      state.error = null
      state.isLoading = false
      localStorage.setItem('authToken', action.payload.token)
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      localStorage.removeItem('authToken')
      localStorage.removeItem('authToken')
    },
    registerSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      state.error = null
      state.isLoading = false
      localStorage.setItem('authToken', action.payload.token)
    },
    registerFailure: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },
    clearError: (state) => {
      state.error = null
    },
  },
})

export const {
  setLoading,
  login,
  loginSuccess,
  loginFailure,
  logout,
  registerSuccess,
  registerFailure,
  clearError,
} = authSlice.actions

export default authSlice.reducer
