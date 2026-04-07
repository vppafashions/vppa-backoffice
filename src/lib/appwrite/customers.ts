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

export interface CustomerWithActivity extends Customer {
  cartItems: CartDocument[];
  wishlistItems: WishlistDocument[];
  cartTotal: number;
}

export async function getCustomersWithActivity(): Promise<CustomerWithActivity[]> {
  const [customersRes, cartsRes, wishlistsRes] = await Promise.all([getCustomers(), getAllCarts(), getAllWishlists()]);

  const customers = customersRes.documents as Customer[];
  const carts = cartsRes.documents as CartDocument[];
  const wishlists = wishlistsRes.documents as WishlistDocument[];

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

  // Collect all unique userIds from carts and wishlists that don't have a customer record
  const customerUserIds = new Set(customers.map((c) => c.userId));
  const allUserIds = new Set([...cartsByUser.keys(), ...wishlistsByUser.keys()]);

  const result: CustomerWithActivity[] = customers.map((customer) => {
    const userCarts = cartsByUser.get(customer.userId) || [];
    const userWishlists = wishlistsByUser.get(customer.userId) || [];
    return {
      ...customer,
      cartItems: userCarts,
      wishlistItems: userWishlists,
      cartTotal: userCarts.reduce((sum, item) => sum + item.price * item.quantity, 0),
    };
  });

  // Add anonymous users (have cart/wishlist but no customer profile)
  for (const userId of allUserIds) {
    if (!customerUserIds.has(userId)) {
      const userCarts = cartsByUser.get(userId) || [];
      const userWishlists = wishlistsByUser.get(userId) || [];
      result.push({
        userId,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
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
      });
    }
  }

  return result;
}
