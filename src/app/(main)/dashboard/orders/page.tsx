"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, Copy, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CharCount } from "@/components/ui/char-count";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { findInvoiceByOrderId, generateInvoiceFromOrder } from "@/lib/appwrite/invoices";
import { getOrders, sendOrderStatusEmail, updateOrderStatus, updateOrderTracking } from "@/lib/appwrite/orders";
import type { Invoice, Order, OrderItem, StatusTimeline } from "@/lib/appwrite/types";

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
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [orderInvoice, setOrderInvoice] = useState<Invoice | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success(`${field} copied`);
      setTimeout(() => setCopiedField((c) => (c === field ? null : c)), 1500);
    } catch {
      toast.error("Failed to copy");
    }
  };

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

  const parseTimeline = (timelineStr?: string): StatusTimeline => {
    if (!timelineStr) return {};
    try {
      return JSON.parse(timelineStr);
    } catch {
      return {};
    }
  };

  const handleStatusChange = async (orderId: string, status: Order["status"], currentTimeline?: string) => {
    try {
      const updatedOrder = await updateOrderStatus(orderId, status, currentTimeline);
      toast.success(`Order status updated to ${status}`);

      // Send email notification to customer (fire and forget)
      sendOrderStatusEmail(updatedOrder, status)
        .then(() => {
          toast.success("Email notification sent to customer");
        })
        .catch(() => {
          toast.error("Failed to send email notification");
        });

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
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
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
                    <TableCell className="text-sm">{order.phone || "—"}</TableCell>
                    <TableCell className="max-w-xs text-muted-foreground text-xs">
                      <div className="line-clamp-2 whitespace-pre-wrap" title={order.address || ""}>
                        {order.address || "—"}
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
                        onClick={async () => {
                          setSelectedOrder(order);
                          setTrackingNumber(order.trackingNumber || "");
                          setCourier(order.courier || "");
                          setDetailsOpen(true);
                          setOrderInvoice(null);
                          setLoadingInvoice(true);
                          try {
                            const inv = await findInvoiceByOrderId(order.$id);
                            setOrderInvoice(inv);
                          } catch {
                            // ignore
                          } finally {
                            setLoadingInvoice(false);
                          }
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
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <div className="flex items-center gap-1">
                    <p className="flex-1 font-medium break-words">{selectedOrder.customerName}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyToClipboard(selectedOrder.customerName, "Name")}
                      aria-label="Copy name"
                    >
                      {copiedField === "Name" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-1">
                    <p className="flex-1 font-medium break-all">{selectedOrder.email}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyToClipboard(selectedOrder.email, "Email")}
                      aria-label="Copy email"
                    >
                      {copiedField === "Email" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                {selectedOrder.phone && (
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <div className="flex items-center gap-1">
                      <p className="flex-1 font-medium">{selectedOrder.phone}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => copyToClipboard(selectedOrder.phone || "", "Phone")}
                        aria-label="Copy phone"
                      >
                        {copiedField === "Phone" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Total</Label>
                  <p className="font-medium">{formatCurrency(selectedOrder.total)}</p>
                </div>
                {(selectedOrder.discount ?? 0) > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Coupon discount</Label>
                    <p className="font-medium">
                      -{formatCurrency(selectedOrder.discount || 0)}
                      {selectedOrder.couponCode ? (
                        <span className="ml-2 font-mono text-muted-foreground text-sm">
                          ({selectedOrder.couponCode})
                        </span>
                      ) : null}
                    </p>
                  </div>
                )}
              </div>

              {selectedOrder.address && (
                <div className="text-sm">
                  <Label className="text-muted-foreground">Address</Label>
                  <div className="flex items-start gap-1">
                    <p className="flex-1 font-medium whitespace-pre-wrap">{selectedOrder.address}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyToClipboard(selectedOrder.address || "", "Address")}
                      aria-label="Copy address"
                    >
                      {copiedField === "Address" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
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
                <SearchableSelect
                  value={selectedOrder.status}
                  onValueChange={(value) => {
                    handleStatusChange(selectedOrder.$id, value as Order["status"], selectedOrder.statusTimeline);
                    const timeline = parseTimeline(selectedOrder.statusTimeline);
                    timeline[value] = new Date().toISOString();
                    setSelectedOrder({
                      ...selectedOrder,
                      status: value as Order["status"],
                      statusTimeline: JSON.stringify(timeline),
                    });
                  }}
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "confirmed", label: "Confirmed" },
                    { value: "shipped", label: "Shipped" },
                    { value: "delivered", label: "Delivered" },
                    { value: "cancelled", label: "Cancelled" },
                  ]}
                  placeholder="Select status"
                  searchPlaceholder="Search..."
                />
              </div>

              {/* Status Timeline */}
              {(() => {
                const timeline = parseTimeline(selectedOrder.statusTimeline);
                const steps: { key: Order["status"]; label: string }[] = [
                  { key: "pending", label: "Order Placed" },
                  { key: "confirmed", label: "Confirmed" },
                  { key: "shipped", label: "Shipped" },
                  { key: "delivered", label: "Delivered" },
                ];
                if (selectedOrder.status === "cancelled" || timeline.cancelled) {
                  steps.push({ key: "cancelled", label: "Cancelled" });
                }
                const hasAnyTimestamp = Object.keys(timeline).length > 0;
                if (!hasAnyTimestamp && selectedOrder.status === "pending") return null;
                return (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Status Timeline</Label>
                    <div className="space-y-1">
                      {steps.map((step) => {
                        const ts = timeline[step.key];
                        const isCurrent = selectedOrder.status === step.key;
                        return (
                          <div
                            key={step.key}
                            className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${
                              isCurrent ? "bg-primary/10 font-medium" : ts ? "bg-muted/50" : "text-muted-foreground/50"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${ts ? "bg-primary" : "bg-muted-foreground/30"}`}
                              />
                              {step.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{ts ? formatDate(ts) : "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

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
                  <SearchableSelect
                    value={courier}
                    onValueChange={setCourier}
                    options={[
                      { value: "BlueDart", label: "BlueDart" },
                      { value: "DTDC", label: "DTDC" },
                      { value: "Delhivery", label: "Delhivery" },
                      { value: "FedEx", label: "FedEx" },
                      { value: "DHL", label: "DHL" },
                      { value: "India Post", label: "India Post" },
                      { value: "Ekart", label: "Ekart" },
                      { value: "Shadowfax", label: "Shadowfax" },
                      { value: "Xpressbees", label: "Xpressbees" },
                      { value: "Ecom Express", label: "Ecom Express" },
                      { value: "Other", label: "Other" },
                    ]}
                    placeholder="Select courier"
                    searchPlaceholder="Search couriers..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Tracking Number</Label>
                  <Input
                    placeholder="Enter tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                  <CharCount current={trackingNumber.length} max={255} />
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

              {/* Invoice Section */}
              <div className="space-y-3 rounded-lg border p-4">
                <Label className="font-semibold">Invoice</Label>
                {loadingInvoice ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking for invoice...
                  </div>
                ) : orderInvoice ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span>
                        Invoice <span className="font-mono font-medium">#{orderInvoice.invoiceNumber}</span> —{" "}
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 2,
                        }).format(orderInvoice.grandTotal)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.open(`/dashboard/invoices?view=${orderInvoice.$id}`, "_blank");
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Invoice
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    disabled={generatingInvoice}
                    onClick={async () => {
                      if (!selectedOrder) return;
                      setGeneratingInvoice(true);
                      try {
                        const inv = await generateInvoiceFromOrder(selectedOrder);
                        setOrderInvoice(inv);
                        toast.success(`Invoice #${inv.invoiceNumber} generated`);
                      } catch (error) {
                        console.error("Invoice generation failed:", error);
                        toast.error("Failed to generate invoice");
                      } finally {
                        setGeneratingInvoice(false);
                      }
                    }}
                  >
                    {generatingInvoice ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Invoice
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
