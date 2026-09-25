"use client"

import { useEffect } from "react"
import { useCart } from "./CartContext"
import ProductImage from "./ProductImage"
import { CartIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon } from "./storeIcons"
import { formatPeso } from "./storeUtils"

export default function CartDrawer() {
  const { items, count, subtotal, drawerOpen, closeCart, removeItem, setQuantity, openCheckout } = useCart()

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [drawerOpen])

  return (
    <div
      className={`fixed inset-0 z-[70] ${drawerOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!drawerOpen}
    >
      {/* Backdrop */}
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-black text-gray-900">
            <span className="flex items-center justify-center rounded-lg bg-yellow-400 p-1.5 text-black">
              <CartIcon className="w-4 h-4" />
            </span>
            Your Cart ({count})
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-300">
              <CartIcon className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-gray-700">Your cart is empty</p>
            <p className="text-xs text-gray-500">Browse our products and add items to get started.</p>
            <button
              type="button"
              onClick={closeCart}
              className="mt-2 rounded-lg bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-yellow-300"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-4 py-3">
              {items.map((item) => (
                <li key={item.id} className="mb-3 flex gap-3 rounded-xl border border-gray-100 p-3">
                  <div className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-lg bg-white">
                    <ProductImage src={item.image} alt={item.name} className="h-full w-full" iconSize={32} />
                  </div>

                  <div className="relative flex min-w-0 flex-1 flex-col">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>

                    <p className="pr-7 text-sm font-bold leading-snug text-gray-900 line-clamp-1">{item.name}</p>
                    {item.model && <p className="text-xs text-gray-500">{item.model}</p>}
                    <p className="mt-0.5 text-xs font-semibold text-gray-600">{formatPeso(item.unitPrice, 2)} / {item.unit || "pc"}</p>

                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-gray-200">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors hover:bg-gray-50 disabled:text-gray-300"
                          disabled={item.quantity <= 1}
                        >
                          <MinusIcon className="w-3.5 h-3.5" />
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="flex h-8 w-8 items-center justify-center text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-black text-gray-900">
                        {formatPeso(Number(item.unitPrice) * item.quantity, 2)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-gray-100 px-5 py-4">
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <dt>Subtotal</dt>
                  <dd className="font-bold text-gray-900">{formatPeso(subtotal, 2)}</dd>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <dt>Shipping</dt>
                  <dd className="text-xs font-semibold text-gray-400">To be calculated</dd>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-base">
                  <dt className="font-black text-gray-900">Total</dt>
                  <dd className="font-black text-gray-900">{formatPeso(subtotal, 2)}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={openCheckout}
                className="mt-4 w-full rounded-xl bg-yellow-400 px-4 py-3.5 text-sm font-black text-black shadow-lg shadow-yellow-400/25 transition-all hover:bg-yellow-300 active:scale-[0.99]"
              >
                Proceed to Checkout
              </button>
              <p className="mt-2 text-center text-[10px] text-gray-400">
                Shipping fee and payment confirmation handled by our team after you place the order.
              </p>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}