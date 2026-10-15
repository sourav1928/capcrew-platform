import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../services/api'
import { setStoreConfig } from '../store/slices/configSlice'
import { applyCommerceConfig } from '../store/slices/cartSlice'

/** Loads the owner's store settings once and keeps the cart maths in step with them. */
export function useStoreConfigLoader() {
  const dispatch = useDispatch()
  const { data } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => (await apiClient.getStoreConfig()).data.data,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  })
  useEffect(() => {
    if (!data) return
    dispatch(setStoreConfig(data))
    dispatch(
      applyCommerceConfig({
        gstPercent: Number(data.gst_percent),
        pricesIncludeGst: !!data.prices_include_gst,
        freeShippingThreshold: Number(data.free_shipping_threshold),
        shippingFee: Number(data.shipping_flat_fee),
        maxQty: Number(data.max_qty_per_item),
      })
    )
  }, [data, dispatch])
}
