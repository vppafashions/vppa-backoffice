"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

export default function HeroesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/heroes/homepage");
  }, [router]);

  return <div className="py-8 text-center text-muted-foreground">Redirecting...</div>;
}
