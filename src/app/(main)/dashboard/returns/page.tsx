"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getReturns, processRazorpayRefund, sendReturnStatusEmail, updateReturnStatus } from "@/lib/appwrite/returns";
import type { ReturnItem, ReturnRequest, ReturnStatus } from "@/lib/appwrite/types";

const STATUS_COLORS: Record<ReturnStatus, string> = {
  requested: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  picked_up: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  refunded: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  rejected: "Rejected",
  picked_up: "Picked Up",
  refunded: "Refunded",
};

type StatusFilter = "all" | ReturnStatus;

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchReturns = useCallback(async () => {
    try {
      const res = await getReturns();
      setReturns(res.documents as ReturnRequest[]);
    } catch (error) {
      console.error("Failed to fetch returns:", error);
      toast.error("Failed to load returns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const parseItems = (items: string): ReturnItem[] => {
    try {
      return JSON.parse(items) as ReturnItem[];
    } catch {
      return [];
    }
  };

  const parseTimeline = (timelineStr?: string): Record<string, string> => {
    if (!timelineStr) return {};
    try {
      return JSON.parse(timelineStr);
    } catch {
      return {};
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

  const handleStatusChange = async (status: ReturnStatus) => {
    if (!selectedReturn) return;
    setProcessing(true);
    try {
      const updated = await updateReturnStatus(
        selectedReturn.$id,
        status,
        selectedReturn.statusTimeline,
        adminNotes || undefined,
        refundAmount ? Number(refundAmount) : undefined,
      );
      toast.success(`Return status updated to ${STATUS_LABELS[status]}`);

      sendReturnStatusEmail(updated, status)
        .then(() => toast.success("Email notification sent to customer"))
        .catch(() => toast.error("Failed to send email notification"));

      setSelectedReturn({ ...selectedReturn, ...updated });
      fetchReturns();
    } catch (error) {
      console.error("Failed to update return status:", error);
      toast.error("Failed to update return status");
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!selectedReturn) return;
    const amount = Number(refundAmount) || selectedReturn.refundAmount;
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    setProcessing(true);
    try {
      let razorpayRefundId = "";

      if (selectedReturn.originalPaymentId) {
        const refundResult = await processRazorpayRefund(selectedReturn.originalPaymentId, amount);
        razorpayRefundId = refundResult.refundId;
        toast.success(`Razorpay refund processed: ${razorpayRefundId}`);
      } else {
        toast.info("No Razorpay payment ID found — marking as manually refunded");
      }

      const updated = await updateReturnStatus(
        selectedReturn.$id,
        "refunded",
        selectedReturn.statusTimeline,
        adminNotes || undefined,
        amount,
        "Original Payment",
        razorpayRefundId,
      );

      sendReturnStatusEmail(updated, "refunded")
        .then(() => toast.success("Refund confirmation email sent"))
        .catch(() => toast.error("Failed to send refund email"));

      setSelectedReturn({ ...selectedReturn, ...updated });
      fetchReturns();
    } catch (error) {
      console.error("Refund failed:", error);
      toast.error(error instanceof Error ? error.message : "Refund failed");
    } finally {
      setProcessing(false);
    }
  };

  const filteredReturns = statusFilter === "all" ? returns : returns.filter((r) => r.status === statusFilter);

  const counts = {
    all: returns.length,
    requested: returns.filter((r) => r.status === "requested").length,
    approved: returns.filter((r) => r.status === "approved").length,
    picked_up: returns.filter((r) => r.status === "picked_up").length,
    refunded: returns.filter((r) => r.status === "refunded").length,
    rejected: returns.filter((r) => r.status === "rejected").length,
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Returns & Refunds</h1>
        <p className="text-muted-foreground text-sm">Manage customer return requests and process refunds</p>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {(
          [
            { key: "all" as StatusFilter, label: "All", color: "bg-gray-100 dark:bg-gray-800" },
            { key: "requested" as StatusFilter, label: "Pending", color: "bg-yellow-50 dark:bg-yellow-950" },
            { key: "approved" as StatusFilter, label: "Approved", color: "bg-blue-50 dark:bg-blue-950" },
            { key: "picked_up" as StatusFilter, label: "Picked Up", color: "bg-purple-50 dark:bg-purple-950" },
            { key: "refunded" as StatusFilter, label: "Refunded", color: "bg-green-50 dark:bg-green-950" },
            { key: "rejected" as StatusFilter, label: "Rejected", color: "bg-red-50 dark:bg-red-950" },
          ] as const
        ).map((s) => (
          <button
            key={s.key}
            type="button"
            className={`rounded-lg border p-3 text-left transition-all ${
              statusFilter === s.key ? "ring-2 ring-primary" : ""
            } ${s.color}`}
            onClick={() => setStatusFilter(s.key)}
          >
            <div className="text-muted-foreground text-xs">{s.label}</div>
            <div className="font-bold text-2xl">{counts[s.key]}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === "all" ? "All Returns" : `${STATUS_LABELS[statusFilter]} Returns`} (
            {filteredReturns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading returns...</div>
          ) : filteredReturns.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {statusFilter === "all"
                ? "No return requests yet. Returns will appear here when customers submit them."
                : `No ${STATUS_LABELS[statusFilter].toLowerCase()} returns.`}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((ret) => (
                  <TableRow key={ret.$id}>
                    <TableCell className="font-mono text-xs">{ret.$id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{ret.customerName}</div>
                        <div className="text-muted-foreground text-xs">{ret.customerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{ret.orderId.slice(0, 8)}...</TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm">{ret.reason}</TableCell>
                    <TableCell>{formatCurrency(ret.refundAmount)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[ret.status] || ""} variant="outline">
                        {STATUS_LABELS[ret.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(ret.$createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedReturn(ret);
                          setAdminNotes(ret.adminNotes || "");
                          setRefundAmount(String(ret.refundAmount || ""));
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

      {/* Return Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedReturn.customerName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedReturn.customerEmail}</p>
                </div>
                {selectedReturn.customerPhone && (
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedReturn.customerPhone}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Order ID</Label>
                  <p className="font-mono text-xs">{selectedReturn.orderId}</p>
                </div>
              </div>

              {/* Reason */}
              <div className="text-sm">
                <Label className="text-muted-foreground">Reason</Label>
                <p className="font-medium">{selectedReturn.reason}</p>
                {selectedReturn.reasonDetails && (
                  <p className="mt-1 text-muted-foreground">{selectedReturn.reasonDetails}</p>
                )}
              </div>

              {/* Items */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Return Items</Label>
                <div className="space-y-1">
                  {parseItems(selectedReturn.items).map((item, i) => (
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

              {/* Payment Info */}
              {selectedReturn.originalPaymentId && (
                <div className="text-sm">
                  <Label className="text-muted-foreground">Original Payment ID</Label>
                  <p className="font-mono text-xs">{selectedReturn.originalPaymentId}</p>
                </div>
              )}

              {selectedReturn.razorpayRefundId && (
                <div className="text-sm">
                  <Label className="text-muted-foreground">Razorpay Refund ID</Label>
                  <p className="font-mono text-xs">{selectedReturn.razorpayRefundId}</p>
                </div>
              )}

              {/* Status Timeline */}
              {(() => {
                const timeline = parseTimeline(selectedReturn.statusTimeline);
                const steps: { key: ReturnStatus; label: string }[] = [
                  { key: "requested", label: "Return Requested" },
                  { key: "approved", label: "Approved" },
                  { key: "picked_up", label: "Picked Up" },
                  { key: "refunded", label: "Refunded" },
                ];
                if (selectedReturn.status === "rejected" || timeline.rejected) {
                  steps.splice(1, 0, { key: "rejected", label: "Rejected" });
                }
                const hasAnyTimestamp = Object.keys(timeline).length > 0;
                if (!hasAnyTimestamp && selectedReturn.status === "requested") return null;
                return (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Status Timeline</Label>
                    <div className="space-y-1">
                      {steps.map((step) => {
                        const ts = timeline[step.key];
                        const isCurrent = selectedReturn.status === step.key;
                        return (
                          <div
                            key={step.key}
                            className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${
                              isCurrent ? "bg-primary/10 font-medium" : ts ? "bg-muted/50" : "text-muted-foreground/50"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  ts ? "bg-primary" : "bg-muted-foreground/30"
                                }`}
                              />
                              {step.label}
                            </span>
                            <span className="text-muted-foreground text-xs">{ts ? formatDate(ts) : "—"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Refund Amount */}
              <div className="space-y-2">
                <Label>Refund Amount (INR)</Label>
                <Input
                  type="number"
                  placeholder="Enter refund amount"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  disabled={selectedReturn.status === "refunded"}
                />
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Internal notes about this return..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {selectedReturn.status === "requested" && (
                  <>
                    <Button size="sm" disabled={processing} onClick={() => handleStatusChange("approved")}>
                      {processing ? "Processing..." : "Approve Return"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={processing}
                      onClick={() => handleStatusChange("rejected")}
                    >
                      {processing ? "Processing..." : "Reject Return"}
                    </Button>
                  </>
                )}
                {selectedReturn.status === "approved" && (
                  <Button size="sm" disabled={processing} onClick={() => handleStatusChange("picked_up")}>
                    {processing ? "Processing..." : "Mark as Picked Up"}
                  </Button>
                )}
                {(selectedReturn.status === "approved" || selectedReturn.status === "picked_up") && (
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={processing}
                    onClick={handleProcessRefund}
                  >
                    {processing ? "Processing Refund..." : "Process Refund"}
                  </Button>
                )}
                {selectedReturn.status === "refunded" && (
                  <Badge className="bg-green-100 text-green-800">
                    Refund Completed — {formatCurrency(selectedReturn.refundAmount)}
                  </Badge>
                )}
              </div>
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
