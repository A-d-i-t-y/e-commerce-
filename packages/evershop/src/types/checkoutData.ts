import { Address } from './customerAddress.js';

export interface CheckoutData {
  customer?: {
    id?: string;
    email: string;
    fullName?: string;
  };
  shippingAddress?: Address;
  billingAddress?: Address;
  paymentMethod?: string;
  shippingMethod?: string;
  /**
   * Shipping provider code that goes with `shippingMethod`. Required when
   * the storefront wants the server to re-set the cart's shipping method
   * during checkout (the `checkout.ts` service calls `setShippingMethod`,
   * which needs both `provider_code` and `method_code`). When omitted, the
   * server falls back to the cart's persisted
   * `shipping_method_data.provider_code` IF the persisted method code
   * matches `shippingMethod`. Mismatch / both missing → checkout fails with
   * a clear error. The previous behavior silently defaulted to `'core'`,
   * which mis-routed non-core selections through Core's validator and
   * surfaced as "Selected shipping method is no longer available."
   */
  shippingProvider?: string;
  [key: string]: unknown;
}
