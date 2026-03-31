"use client";

import { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { ID, type Models } from "appwrite";

import { account } from "./config";

export function useAuth() {
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
    await account.createEmailPasswordSession({ email, password });
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
    await account.deleteSession("current");
    setUser(null);
    router.push("/auth/v1/login");
  };

  return { user, loading, login, register, logout, checkSession };
}
