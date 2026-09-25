"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { CartItem } from "./storeUtils"

const CART_STORAGE_KEY = "elettro_cart_v1"

type CartContextValue = {
  items: CartItem[]
  count: number
  subtotal: number
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void
  removeItem: (id: string) => void
  setQuantity: (id: string, quantity: number) => void
  clear: () => void
  drawerOpen: boolean
  openCart: () => void
  closeCart: () => void
  checkoutOpen: boolean
  openCheckout: () => void
  closeCheckout: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Load once from localStorage (guest persistence).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CART_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(
            (it) => it && typeof it.id === "string" && Number(it.unitPrice) > 0 && Math.floor(Number(it.quantity)) >= 1
          )
          setItems(cleaned)
        }
      }
    } catch {
      // ignore corrupted storage
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      if (items.length === 0) window.localStorage.removeItem(CART_STORAGE_KEY)
      else window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // storage may be unavailable (private mode); cart keeps working in-memory
    }
  }, [items, hydrated])

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    const qty = Math.max(1, Math.floor(Number(quantity) || 1))
    setItems((prev) => {
      const existing = prev.find((it) => it.id === item.id)
      if (existing) {
        return prev.map((it) => (it.id === item.id ? { ...it, quantity: it.quantity + qty } : it))
      }
      return [...prev, { ...item, quantity: qty }]
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }, [])

  const setQuantity = useCallback((id: string, quantity: number) => {
    const qty = Math.max(1, Math.floor(Number(quantity) || 1))
    setItems((prev) => prev.map((it) => (it.id === id && qty >= 1 ? { ...it, quantity: qty } : it)))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const openCart = useCallback(() => setDrawerOpen(true), [])
  const closeCart = useCallback(() => setDrawerOpen(false), [])
  const openCheckout = useCallback(() => {
    setDrawerOpen(false)
    setCheckoutOpen(true)
  }, [])
  const closeCheckout = useCallback(() => setCheckoutOpen(false), [])

  const count = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items])
  const subtotal = useMemo(() => items.reduce((sum, it) => sum + Number(it.unitPrice) * it.quantity, 0), [items])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      subtotal,
      addItem,
      removeItem,
      setQuantity,
      clear,
      drawerOpen,
      openCart,
      closeCart,
      checkoutOpen,
      openCheckout,
      closeCheckout,
    }),
    [items, count, subtotal, addItem, removeItem, setQuantity, clear, drawerOpen, openCart, closeCart, checkoutOpen, openCheckout, closeCheckout]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within a CartProvider")
  return ctx
}