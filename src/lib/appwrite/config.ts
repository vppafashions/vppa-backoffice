import { Account, Client, Databases } from "appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://fra.cloud.appwrite.io/v1")
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69aaa3a900228aff9ae5");

export const databases = new Databases(client);
export const account = new Account(client);

export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "69aaa3c3001805a8a9ef";

export const COLLECTION_IDS = {
  products: "products",
  collections: "collections",
  orders: "orders",
  heroes: "heroes",
} as const;

export const CLOUDINARY = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dp6k1cln0",
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "vppa_unsigned",
  folder: "vppa",
} as const;

export { client };
