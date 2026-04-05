"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOrders, updateOrderStatus, updateOrderTracking } from "@/lib/appwrite/orders";
import type { Order, OrderItem } from "@/lib/appwrite/types";

const STATUS_COLORS: Record<Order["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courier, setCourier] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await getOrders();
      setOrders(res.documents as Order[]);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, status: Order["status"]) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order status updated to ${status}`);
      fetchOrders();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update order status");
    }
  };

  const parseItems = (items: string): OrderItem[] => {
    try {
      return JSON.parse(items) as OrderItem[];
    } catch {
      return [];
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm">Manage customer orders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No orders yet. Orders will appear here when customers place them.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.$id}>
                    <TableCell className="font-mono text-xs">{order.$id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-muted-foreground text-xs">{order.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[order.status] || ""} variant="outline">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(order.$createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setTrackingNumber(order.trackingNumber || "");
                          setCourier(order.courier || "");
                          setDetailsOpen(true);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedOrder.email}</p>
                </div>
                {selectedOrder.phone && (
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedOrder.phone}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Total</Label>
                  <p className="font-medium">{formatCurrency(selectedOrder.total)}</p>
                </div>
              </div>

              {selectedOrder.address && (
                <div className="text-sm">
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium">{selectedOrder.address}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground">Items</Label>
                <div className="space-y-1">
                  {parseItems(selectedOrder.items).map((item, i) => (
                    <div
                      key={`${item.productId}-${i}`}
                      className="flex justify-between rounded bg-muted/50 p-2 text-sm"
                    >
                      <span>
                        {item.name} x{item.quantity}
                        {item.size ? ` (${item.size})` : ""}
                        {item.color ? ` - ${item.color}` : ""}
                      </span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(value) => {
                    handleStatusChange(selectedOrder.$id, value as Order["status"]);
                    setSelectedOrder({ ...selectedOrder, status: value as Order["status"] });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder.razorpayPaymentId && (
                <div className="text-sm">
                  <Label className="text-muted-foreground">Razorpay Payment ID</Label>
                  <p className="font-mono text-xs">{selectedOrder.razorpayPaymentId}</p>
                </div>
              )}

              <div className="space-y-3 rounded-lg border p-4">
                <Label className="font-semibold">Shipping & Tracking</Label>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Courier</Label>
                  <Select value={courier} onValueChange={setCourier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select courier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BlueDart">BlueDart</SelectItem>
                      <SelectItem value="DTDC">DTDC</SelectItem>
                      <SelectItem value="Delhivery">Delhivery</SelectItem>
                      <SelectItem value="FedEx">FedEx</SelectItem>
                      <SelectItem value="DHL">DHL</SelectItem>
                      <SelectItem value="India Post">India Post</SelectItem>
                      <SelectItem value="Ekart">Ekart</SelectItem>
                      <SelectItem value="Shadowfax">Shadowfax</SelectItem>
                      <SelectItem value="Xpressbees">Xpressbees</SelectItem>
                      <SelectItem value="Ecom Express">Ecom Express</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Tracking Number</Label>
                  <Input
                    placeholder="Enter tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={savingTracking || (!trackingNumber && !courier)}
                  onClick={async () => {
                    if (!selectedOrder) return;
                    setSavingTracking(true);
                    try {
                      await updateOrderTracking(selectedOrder.$id, trackingNumber, courier);
                      toast.success("Tracking info saved");
                      setSelectedOrder({ ...selectedOrder, trackingNumber, courier });
                      fetchOrders();
                    } catch {
                      toast.error("Failed to save tracking info");
                    } finally {
                      setSavingTracking(false);
                    }
                  }}
                >
                  {savingTracking ? "Saving..." : "Save Tracking Info"}
                </Button>
              </div>

              {selectedOrder.notes && (
                <div className="text-sm">
                  <Label className="text-muted-foreground">Notes</Label>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
