"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createInvoice, getNextInvoiceNumber, updateInvoice } from "@/lib/appwrite/invoices";
import type { Invoice, InvoiceItem } from "@/lib/appwrite/types";
import {
  CGST_RATE,
  calculateInvoiceItem,
  calculateInvoiceTotals,
  GST_RATE,
  HSN_CODE,
  SGST_RATE,
} from "@/lib/invoice-pdf";

interface InvoiceFormProps {
  invoice?: Invoice | null;
  onSaved: () => void;
  onCancel: () => void;
}

interface ItemRow {
  name: string;
  quantity: string;
  rate: string;
  originalRate: string;
}

const emptyItemRow: ItemRow = { name: "", quantity: "1", rate: "", originalRate: "" };

const INDIAN_STATES: Record<string, string> = {
  "AN (35)": "Andaman and Nicobar Islands",
  "AP (37)": "Andhra Pradesh",
  "AR (12)": "Arunachal Pradesh",
  "AS (18)": "Assam",
  "BR (10)": "Bihar",
  "CH (04)": "Chandigarh",
  "CT (22)": "Chhattisgarh",
  "DL (07)": "Delhi",
  "GA (30)": "Goa",
  "GJ (24)": "Gujarat",
  "HP (02)": "Himachal Pradesh",
  "HR (06)": "Haryana",
  "JH (20)": "Jharkhand",
  "JK (01)": "Jammu and Kashmir",
  "KA (29)": "Karnataka",
  "KL (32)": "Kerala",
  "LA (38)": "Ladakh",
  "MH (27)": "Maharashtra",
  "ML (17)": "Meghalaya",
  "MN (14)": "Manipur",
  "MP (23)": "Madhya Pradesh",
  "MZ (15)": "Mizoram",
  "NL (13)": "Nagaland",
  "OR (21)": "Odisha",
  "PB (03)": "Punjab",
  "PY (34)": "Puducherry",
  "RJ (08)": "Rajasthan",
  "SK (11)": "Sikkim",
  "TN (33)": "Tamil Nadu",
  "TR (16)": "Tripura",
  "TS (36)": "Telangana",
  "UK (05)": "Uttarakhand",
  "UP (09)": "Uttar Pradesh",
  "WB (19)": "West Bengal",
};

export default function InvoiceForm({ invoice, onSaved, onCancel }: InvoiceFormProps) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [modeOfTransport, setModeOfTransport] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [stateCode, setStateCode] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPin, setCustomerPin] = useState("");
  const [customerState, setCustomerState] = useState("");

  const [itemRows, setItemRows] = useState<ItemRow[]>([{ ...emptyItemRow }]);
  const [shippingAmount, setShippingAmount] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [status, setStatus] = useState<Invoice["status"]>("draft");
  const [saving, setSaving] = useState(false);

  const loadInvoiceNumber = useCallback(async () => {
    if (!invoice) {
      const nextNum = await getNextInvoiceNumber();
      setInvoiceNumber(nextNum);
    }
  }, [invoice]);

  useEffect(() => {
    loadInvoiceNumber();
  }, [loadInvoiceNumber]);

  useEffect(() => {
    if (invoice) {
      setInvoiceNumber(invoice.invoiceNumber);
      setInvoiceDate(invoice.invoiceDate);
      setOrderNumber(invoice.orderNumber || "");
      setOrderDate(invoice.orderDate || "");
      setModeOfTransport(invoice.modeOfTransport || "");
      setPlaceOfSupply(invoice.placeOfSupply || "");
      setStateCode(invoice.stateCode || "");
      setCustomerName(invoice.customerName);
      setCustomerAddress(invoice.customerAddress || "");
      setCustomerPhone(invoice.customerPhone || "");
      setCustomerEmail(invoice.customerEmail || "");
      setCustomerPin(invoice.customerPin || "");
      setCustomerState(invoice.customerState || "");
      setShippingAmount(String(invoice.shippingAmount || 0));
      setDiscount(String(invoice.discount || 0));
      setStatus(invoice.status);

      try {
        const parsedItems: InvoiceItem[] = JSON.parse(invoice.items);
        setItemRows(
          parsedItems.map((item) => ({
            name: item.name,
            quantity: String(item.quantity),
            rate: String(item.rate),
            originalRate: String(item.originalRate || item.rate),
          })),
        );
      } catch {
        setItemRows([{ ...emptyItemRow }]);
      }
    }
  }, [invoice]);

  const handleStateChange = (code: string) => {
    setStateCode(code);
    const stateName = INDIAN_STATES[code];
    if (stateName) {
      setCustomerState(stateName);
      setPlaceOfSupply(stateName);
    }
  };

  const addItemRow = () => {
    setItemRows((prev) => [...prev, { ...emptyItemRow }]);
  };

  const removeItemRow = (index: number) => {
    if (itemRows.length === 1) return;
    setItemRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: keyof ItemRow, value: string) => {
    setItemRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const computedItems: InvoiceItem[] = itemRows
    .filter((row) => row.name && row.rate)
    .map((row) =>
      calculateInvoiceItem(
        row.name,
        Number.parseFloat(row.quantity) || 1,
        Number.parseFloat(row.rate) || 0,
        Number.parseFloat(row.originalRate) || Number.parseFloat(row.rate) || 0,
      ),
    );

  const totals = calculateInvoiceTotals(
    computedItems,
    Number.parseFloat(shippingAmount) || 0,
    Number.parseFloat(discount) || 0,
  );

  const formatRs = (amount: number) => `Rs. ${amount.toFixed(2)}`;

  const handleSave = async () => {
    if (!invoiceNumber || !invoiceDate || !customerName || computedItems.length === 0) {
      toast.error("Invoice number, date, customer name, and at least one item are required");
      return;
    }

    setSaving(true);
    try {
      const data = {
        invoiceNumber,
        invoiceDate,
        orderNumber: orderNumber || `#VPPA${invoiceNumber}IN`,
        orderDate: orderDate || invoiceDate,
        customerName,
        customerAddress,
        customerPhone,
        customerEmail,
        customerPin,
        customerState,
        stateCode,
        placeOfSupply,
        modeOfTransport,
        items: JSON.stringify(computedItems),
        subtotal: totals.subtotal,
        taxableAmount: totals.taxableAmount,
        cgstAmount: totals.cgstAmount,
        sgstAmount: totals.sgstAmount,
        totalTax: totals.totalTax,
        shippingAmount: Number.parseFloat(shippingAmount) || 0,
        discount: Number.parseFloat(discount) || 0,
        grandTotal: totals.grandTotal,
        status,
      };

      if (invoice) {
        await updateInvoice(invoice.$id, data);
        toast.success("Invoice updated");
      } else {
        await createInvoice(data);
        toast.success("Invoice created");
      }
      onSaved();
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-xl">{invoice ? "Edit Invoice" : "New Invoice"}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : invoice ? "Update Invoice" : "Create Invoice"}
          </Button>
        </div>
      </div>

      {/* Invoice Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Invoice No *</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Invoice Date *</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Order No</Label>
              <Input
                value={orderNumber}
                placeholder={`#VPPA${invoiceNumber}IN`}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mode of Transport</Label>
              <Input value={modeOfTransport} onChange={(e) => setModeOfTransport(e.target.value)} placeholder="-" />
            </div>
            <div className="space-y-2">
              <Label>State Code</Label>
              <Select value={stateCode} onValueChange={handleStateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INDIAN_STATES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {code} - {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Place of Supply</Label>
              <Input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Invoice["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Details */}
      <Card>
        <CardHeader>
          <CardTitle>Billed To / Ship To</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>PIN Code</Label>
              <Input value={customerPin} onChange={(e) => setCustomerPin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={customerState} onChange={(e) => setCustomerState(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button size="sm" variant="outline" onClick={addItemRow}>
              <Plus className="mr-1 size-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Item</TableHead>
                <TableHead className="w-[80px]">Qty</TableHead>
                <TableHead className="w-[120px]">Original Rate</TableHead>
                <TableHead className="w-[120px]">Rate (INR)</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Taxable Val</TableHead>
                <TableHead>CGST</TableHead>
                <TableHead>SGST</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemRows.map((row) => {
                const rowKey = `${row.name}-${row.rate}-${row.quantity}`;
                const computed =
                  row.name && row.rate
                    ? calculateInvoiceItem(
                        row.name,
                        Number.parseFloat(row.quantity) || 1,
                        Number.parseFloat(row.rate) || 0,
                        Number.parseFloat(row.originalRate) || Number.parseFloat(row.rate) || 0,
                      )
                    : null;
                const idx = itemRows.indexOf(row);
                return (
                  <TableRow key={rowKey}>
                    <TableCell>
                      <Input
                        value={row.name}
                        onChange={(e) => updateItemRow(idx, "name", e.target.value)}
                        placeholder="Product name"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) => updateItemRow(idx, "quantity", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.originalRate}
                        onChange={(e) => updateItemRow(idx, "originalRate", e.target.value)}
                        placeholder="MRP"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.rate}
                        onChange={(e) => updateItemRow(idx, "rate", e.target.value)}
                        placeholder="Selling price"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{HSN_CODE}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{GST_RATE}%</TableCell>
                    <TableCell className="text-sm">{computed ? formatRs(computed.taxableValue) : "-"}</TableCell>
                    <TableCell className="text-sm">{computed ? formatRs(computed.cgst) : "-"}</TableCell>
                    <TableCell className="text-sm">{computed ? formatRs(computed.sgst) : "-"}</TableCell>
                    <TableCell className="font-medium text-sm">{computed ? formatRs(computed.total) : "-"}</TableCell>
                    <TableCell>
                      {itemRows.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeItemRow(idx)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Shipping Amount (INR)</Label>
                <Input type="number" value={shippingAmount} onChange={(e) => setShippingAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Discount (INR)</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <div className="flex justify-between text-sm">
                <span>Total Discount:</span>
                <span>{formatRs(Number.parseFloat(discount) || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Amount before Tax:</span>
                <span>{formatRs(totals.taxableAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Tax Amount:</span>
                <span>{formatRs(totals.totalTax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Amount After Tax:</span>
                <span>{formatRs(totals.taxableAmount + totals.totalTax)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping Amount:</span>
                <span>{formatRs(Number.parseFloat(shippingAmount) || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping CGST (0%):</span>
                <span>Rs. 0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping SGST (0%):</span>
                <span>Rs. 0.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Shipping:</span>
                <span>{formatRs(Number.parseFloat(shippingAmount) || 0)}</span>
              </div>
              <div className="my-2 border-t" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatRs(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HSN/SAC</TableHead>
                <TableHead>Central Tax Rate</TableHead>
                <TableHead>Central Tax Amount</TableHead>
                <TableHead>State Tax Rate</TableHead>
                <TableHead>State Tax Amount</TableHead>
                <TableHead>Integrated Tax Rate</TableHead>
                <TableHead>Integrated Tax Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{HSN_CODE}</TableCell>
                <TableCell>{CGST_RATE}%</TableCell>
                <TableCell>{formatRs(totals.cgstAmount)}</TableCell>
                <TableCell>{SGST_RATE}%</TableCell>
                <TableCell>{formatRs(totals.sgstAmount)}</TableCell>
                <TableCell>0%</TableCell>
                <TableCell>Rs. 0.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : invoice ? "Update Invoice" : "Create Invoice"}
        </Button>
      </div>
    </div>
  );
}
