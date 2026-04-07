import { Query } from "appwrite";

import { COLLECTION_IDS, DATABASE_ID, databases } from "./config";
import type { CartDocument, Customer, WishlistDocument } from "./types";

export async function getCustomers() {
  return databases.listDocuments(DATABASE_ID, COLLECTION_IDS.customers, [
    Query.orderDesc("$createdAt"),
    Query.limit(100),
  ]);
}

export async function getCartsByUserId(userId: string) {
  return databases.listDocuments(DATABASE_ID, COLLECTION_IDS.carts, [Query.equal("userId", userId), Query.limit(100)]);
}

export async function getWishlistsByUserId(userId: string) {
  return databases.listDocuments(DATABASE_ID, COLLECTION_IDS.wishlists, [
    Query.equal("userId", userId),
    Query.limit(100),
  ]);
}

export async function getAllCarts() {
  return databases.listDocuments(DATABASE_ID, COLLECTION_IDS.carts, [Query.limit(500)]);
}

export async function getAllWishlists() {
  return databases.listDocuments(DATABASE_ID, COLLECTION_IDS.wishlists, [Query.limit(500)]);
}

export interface AuthUser {
  $id: string;
  name: string;
  email: string;
  phone: string;
}

export interface CustomerWithActivity extends Customer {
  cartItems: CartDocument[];
  wishlistItems: WishlistDocument[];
  cartTotal: number;
  authName?: string;
  authEmail?: string;
  authPhone?: string;
}

export async function getAuthUsers(): Promise<AuthUser[]> {
  try {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listUsers" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.users || []) as AuthUser[];
  } catch {
    return [];
  }
}

export async function getCustomersWithActivity(): Promise<CustomerWithActivity[]> {
  const [customersRes, cartsRes, wishlistsRes, authUsers] = await Promise.all([
    getCustomers(),
    getAllCarts(),
    getAllWishlists(),
    getAuthUsers(),
  ]);

  const customers = customersRes.documents as unknown as Customer[];
  const carts = cartsRes.documents as unknown as CartDocument[];
  const wishlists = wishlistsRes.documents as unknown as WishlistDocument[];

  // Group carts and wishlists by userId
  const cartsByUser = new Map<string, CartDocument[]>();
  for (const cart of carts) {
    const existing = cartsByUser.get(cart.userId) || [];
    existing.push(cart);
    cartsByUser.set(cart.userId, existing);
  }

  const wishlistsByUser = new Map<string, WishlistDocument[]>();
  for (const wl of wishlists) {
    const existing = wishlistsByUser.get(wl.userId) || [];
    existing.push(wl);
    wishlistsByUser.set(wl.userId, existing);
  }

  // Build auth user lookup by ID
  const authUserMap = new Map<string, AuthUser>();
  for (const au of authUsers) {
    authUserMap.set(au.$id, au);
  }

  // Collect all unique userIds from carts and wishlists that don't have a customer record
  const customerUserIds = new Set(customers.map((c) => c.userId));
  const allUserIds = new Set([...cartsByUser.keys(), ...wishlistsByUser.keys()]);
  // Also include auth users who may not have cart/wishlist yet
  for (const au of authUsers) {
    if (au.$id !== "admin") {
      allUserIds.add(au.$id);
    }
  }

  const result: CustomerWithActivity[] = customers.map((customer) => {
    const userCarts = cartsByUser.get(customer.userId) || [];
    const userWishlists = wishlistsByUser.get(customer.userId) || [];
    const authUser = authUserMap.get(customer.userId);
    return {
      ...customer,
      cartItems: userCarts,
      wishlistItems: userWishlists,
      cartTotal: userCarts.reduce((sum, item) => sum + item.price * item.quantity, 0),
      authName: authUser?.name || "",
      authEmail: authUser?.email || "",
      authPhone: authUser?.phone || "",
    };
  });

  // Add anonymous users (have cart/wishlist but no customer profile)
  for (const userId of allUserIds) {
    if (!customerUserIds.has(userId)) {
      const userCarts = cartsByUser.get(userId) || [];
      const userWishlists = wishlistsByUser.get(userId) || [];
      const authUser = authUserMap.get(userId);
      result.push({
        userId,
        firstName: authUser?.name?.split(" ")[0] || "",
        lastName: authUser?.name?.split(" ").slice(1).join(" ") || "",
        email: authUser?.email || "",
        phone: authUser?.phone || "",
        billingAddress: "",
        billingCity: "",
        billingState: "",
        billingPincode: "",
        billingCountry: "",
        shippingAddress: "",
        shippingCity: "",
        shippingState: "",
        shippingPincode: "",
        shippingCountry: "",
        gstin: "",
        companyName: "",
        landmark: "",
        alternatePhone: "",
        sameAsShipping: false,
        cartItems: userCarts,
        wishlistItems: userWishlists,
        cartTotal: userCarts.reduce((sum, item) => sum + item.price * item.quantity, 0),
        $id: userId,
        $collectionId: "",
        $databaseId: "",
        $createdAt: "",
        $updatedAt: "",
        $permissions: [],
        $sequence: "",
      } as CustomerWithActivity);
    }
  }

  return result;
}
