import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/** Store settings the owner controls from the admin panel (tax, delivery, COD, contact, banner). */
export interface StoreConfig {
  gst_percent: string
  prices_include_gst: boolean
  free_shipping_threshold: string
  shipping_flat_fee: string
  cod_enabled: boolean
  cod_max_order_value: string
  online_payments_enabled: boolean
  max_qty_per_item: number
  support_email: string
  support_phone: string
  store_address: string
  announcement: string
}

export const DEFAULT_CONFIG: StoreConfig = {
  gst_percent: '18',
  prices_include_gst: true,
  free_shipping_threshold: '500',
  shipping_flat_fee: '50',
  cod_enabled: true,
  cod_max_order_value: '100000',
  online_payments_enabled: true,
  max_qty_per_item: 10,
  support_email: 'support@capcrew.com',
  support_phone: '+91 98765 43210',
  store_address: 'CapCrew Inc., Bangalore, India',
  announcement: '',
}

const configSlice = createSlice({
  name: 'config',
  initialState: { ...DEFAULT_CONFIG, loaded: false },
  reducers: {
    setStoreConfig: (state, action: PayloadAction<Partial<StoreConfig>>) => ({ ...state, ...action.payload, loaded: true }),
  },
})

export const { setStoreConfig } = configSlice.actions
export default configSlice.reducer
