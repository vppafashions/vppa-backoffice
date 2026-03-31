"use client";

import { useEffect, useState } from "react";

import { Query } from "appwrite";
import { IndianRupee, Layers, Package, ShoppingCart, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { COLLECTION_IDS, DATABASE_ID, databases } from "@/lib/appwrite/config";

interface Stats {
  totalProducts: number;
  totalCollections: number;
  totalOrders: number;
  totalRevenue: number;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalCollections: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [products, collections, orders] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.products, [Query.limit(1)]),
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.collections, [Query.limit(1)]),
          databases.listDocuments(DATABASE_ID, COLLECTION_IDS.orders, [Query.limit(100)]),
        ]);

        const revenue = orders.documents.reduce((sum, order) => {
          const total = typeof order.total === "number" ? order.total : 0;
          return sum + total;
        }, 0);

        setStats({
          totalProducts: products.total,
          totalCollections: collections.total,
          totalOrders: orders.total,
          totalRevenue: revenue,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">VPPA Fashions overview</p>
      </div>

      <div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Products</CardDescription>
            <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
              {loading ? "..." : stats.totalProducts}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <Package className="size-3" />
                Catalog
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">Active products in store</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Collections</CardDescription>
            <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
              {loading ? "..." : stats.totalCollections}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <Layers className="size-3" />
                Catalog
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">Product collections</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
              {loading ? "..." : stats.totalOrders}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <ShoppingCart className="size-3" />
                Sales
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">Orders received</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Revenue</CardDescription>
            <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
              {loading ? "..." : formatCurrency(stats.totalRevenue)}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <TrendingUp className="size-3" />
                Sales
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">Total revenue from orders</div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
