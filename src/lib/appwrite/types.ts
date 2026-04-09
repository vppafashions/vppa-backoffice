import type { Models } from "appwrite";

import type { CollectionSlug } from "./collection-slugs";

export interface Product extends Models.Document {
  name: string;
  itemCode: string;
  hsnCode: string;
  description: string;
  price: number;
  originalPrice: number;
  category: string;
  collectionSlug: CollectionSlug;
  images: string;
  sizes: string;
  colors: string;
  stockQuantity: number;
  displayOnMainPage: boolean;
  displayOnCollectionPage: boolean;
  featured: boolean;
  inStock: boolean;
  slug: string;
  productType: string;
  sku: string;
  variantInventory: string;
  fabricCare: string;
  returnPolicy: string;
  colorImages: string;
  sizeGuideId: string;
  gender: string;
  stickerLabels: string;
  stickerLabel1: string;
  stickerLabel2: string;
}

export interface VariantInventoryItem {
  size: string;
  color: string;
  stock: number;
  itemCode?: string;
}

export interface Collection extends Models.Document {
  name: string;
  slug: string;
  description: string;
  tagline: string;
  image: string;
}

export interface StatusTimeline {
  [key: string]: string | undefined;
  pending?: string;
  confirmed?: string;
  shipped?: string;
  delivered?: string;
  cancelled?: string;
}

export interface Order extends Models.Document {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  items: string;
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  notes: string;
  trackingNumber?: string;
  courier?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  userId?: string;
  statusTimeline?: string;
}

export interface Hero extends Models.Document {
  sectionKey: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  tagline: string;
  ctaText: string;
  ctaLink: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  rate: number;
  originalRate: number;
  hsn: string;
  gstPercent: number;
  cgstPercent: number;
  sgstPercent: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  total: number;
}

export interface HsnCode extends Models.Document {
  code: string;
  description: string;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
}

export interface SizeGuide extends Models.Document {
  name: string;
  gender: string;
  clothingType: string;
  columns: string;
  rows: string;
  unit: string;
}

export interface Customer extends Models.Document {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingPincode: string;
  billingCountry: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  shippingCountry: string;
  gstin: string;
  companyName: string;
  landmark: string;
  alternatePhone: string;
  sameAsShipping: boolean;
}

export interface CartDocument extends Models.Document {
  userId: string;
  productId: string;
  name: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
  image: string;
}

export interface WishlistDocument extends Models.Document {
  userId: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  collectionSlug: string;
}

export type ReturnStatus = "requested" | "approved" | "rejected" | "picked_up" | "refunded";

export interface ReturnRequest extends Models.Document {
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: string;
  reason: string;
  reasonDetails: string;
  status: ReturnStatus;
  refundAmount: number;
  refundMethod: string;
  razorpayRefundId: string;
  adminNotes: string;
  statusTimeline: string;
  originalPaymentId: string;
}

export interface ReturnItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
}

export interface Coupon extends Models.Document {
  code: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  active: boolean;
  expiresAt: string;
  usageLimit: number;
  usedCount: number;
  applicableProductIds: string;
}

export interface Invoice extends Models.Document {
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  customerPin: string;
  customerState: string;
  stateCode: string;
  placeOfSupply: string;
  items: string;
  subtotal: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  shippingAmount: number;
  discount: number;
  grandTotal: number;
  status: "draft" | "sent" | "paid" | "cancelled";
  modeOfTransport: string;
}
