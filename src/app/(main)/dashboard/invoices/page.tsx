"use client";

import { useCallback, useEffect, useState } from "react";

import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteInvoice, getInvoices } from "@/lib/appwrite/invoices";
import type { Invoice } from "@/lib/appwrite/types";

import InvoiceForm from "./_components/invoice-form";
import InvoicePdfView from "./_components/invoice-pdf-view";

type ViewMode = "list" | "create" | "edit" | "pdf";

const STATUS_COLORS: Record<Invoice["status"], string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await getInvoices();
      setInvoices(res.documents as Invoice[]);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleDelete = async () => {
    if (!deletingInvoice) return;
    try {
      await deleteInvoice(deletingInvoice.$id);
      toast.success("Invoice deleted");
      setDeleteDialogOpen(false);
      setDeletingInvoice(null);
      fetchInvoices();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete invoice");
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (viewMode === "create") {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <InvoiceForm
          onSaved={() => {
            setViewMode("list");
            fetchInvoices();
          }}
          onCancel={() => setViewMode("list")}
        />
      </div>
    );
  }

  if (viewMode === "edit" && selectedInvoice) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <InvoiceForm
          invoice={selectedInvoice}
          onSaved={() => {
            setViewMode("list");
            setSelectedInvoice(null);
            fetchInvoices();
          }}
          onCancel={() => {
            setViewMode("list");
            setSelectedInvoice(null);
          }}
        />
      </div>
    );
  }

  if (viewMode === "pdf" && selectedInvoice) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <InvoicePdfView
          invoice={selectedInvoice}
          onBack={() => {
            setViewMode("list");
            setSelectedInvoice(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Invoices</h1>
          <p className="text-muted-foreground text-sm">Create and manage GST tax invoices</p>
        </div>
        <Button onClick={() => setViewMode("create")}>
          <Plus className="mr-2 size-4" />
          New Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No invoices yet. Click &quot;New Invoice&quot; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.$id}>
                    <TableCell className="font-medium font-mono">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(inv.invoiceDate)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{inv.customerName}</div>
                        {inv.customerEmail && <div className="text-muted-foreground text-xs">{inv.customerEmail}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(inv.taxableAmount)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatCurrency(inv.totalTax)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(inv.grandTotal)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[inv.status] || ""} variant="outline">
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="View / Print"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setViewMode("pdf");
                          }}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Edit"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setViewMode("edit");
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Delete"
                          onClick={() => {
                            setDeletingInvoice(inv);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete invoice #{deletingInvoice?.invoiceNumber}? This action cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
