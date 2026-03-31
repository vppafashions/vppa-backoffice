"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useAuth } from "@/context/auth-context";

export function DashboardAuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/v1/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
