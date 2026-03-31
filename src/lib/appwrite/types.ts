import type { Models } from "appwrite";

export interface Product extends Models.Document {
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  category: string;
  collectionSlug: string;
  images: string;
  sizes: string;
  colors: string;
  featured: boolean;
  inStock: boolean;
  slug: string;
}

export interface Collection extends Models.Document {
  name: string;
  slug: string;
  description: string;
  tagline: string;
  image: string;
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
