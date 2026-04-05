"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ID, type Models } from "appwrite";

import { account } from "@/lib/appwrite/config";

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkSession = useCallback(async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession({ email, password });
    } catch (err: unknown) {
      // If session already active, delete it and retry once
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes("session") || message.toLowerCase().includes("401")) {
        try {
          await account.deleteSession("current");
        } catch {
          // Ignore — session may not exist
        }
        await account.createEmailPasswordSession({ email, password });
      } else {
        throw err;
      }
    }
    const currentUser = await account.get();
    setUser(currentUser);
    router.push("/dashboard/overview");
  };

  const register = async (email: string, password: string, name?: string) => {
    await account.create({
      userId: ID.unique(),
      email,
      password,
      name,
    });
    await login(email, password);
  };

  const logout = async () => {
    try {
      await account.deleteSession("current");
    } catch {
      // Session may already be expired
    }
    setUser(null);
    router.push("/auth/v1/login");
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
