"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CharCount } from "@/components/ui/char-count";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getHsnCodes } from "@/lib/appwrite/hsn-codes";
import { createInvoice, getNextInvoiceNumber, updateInvoice } from "@/lib/appwrite/invoices";
import type { HsnCode, Invoice, InvoiceItem } from "@/lib/appwrite/types";
import {
  calculateInvoiceItem,
  calculateInvoiceTotals,
  DEFAULT_CGST_RATE,
  DEFAULT_HSN_CODE,
  DEFAULT_SGST_RATE,
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
  hsnCodeId: string;
  hsn: string;
  cgstPercent: number;
  sgstPercent: number;
}

const emptyItemRow: ItemRow = {
  name: "",
  quantity: "1",
  rate: "",
  originalRate: "",
  hsnCodeId: "",
  hsn: DEFAULT_HSN_CODE,
  cgstPercent: DEFAULT_CGST_RATE,
  sgstPercent: DEFAULT_SGST_RATE,
};

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
  const [hsnCodes, setHsnCodes] = useState<HsnCode[]>([]);

  const loadInvoiceNumber = useCallback(async () => {
    if (!invoice) {
      const nextNum = await getNextInvoiceNumber();
      setInvoiceNumber(nextNum);
    }
  }, [invoice]);

  useEffect(() => {
    loadInvoiceNumber();
    getHsnCodes()
      .then((res) => setHsnCodes(res.documents as HsnCode[]))
      .catch(() => {
        /* ignore */
      });
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
            hsnCodeId: "",
            hsn: item.hsn || DEFAULT_HSN_CODE,
            cgstPercent: item.cgstPercent ?? DEFAULT_CGST_RATE,
            sgstPercent: item.sgstPercent ?? DEFAULT_SGST_RATE,
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
        row.hsn,
        row.cgstPercent,
        row.sgstPercent,
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
              <CharCount current={invoiceNumber.length} max={50} />
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
              <CharCount current={orderNumber.length} max={50} />
            </div>
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mode of Transport</Label>
              <Input value={modeOfTransport} onChange={(e) => setModeOfTransport(e.target.value)} placeholder="-" />
              <CharCount current={modeOfTransport.length} max={100} />
            </div>
            <div className="space-y-2">
              <Label>State Code</Label>
              <SearchableSelect
                value={stateCode}
                onValueChange={handleStateChange}
                options={Object.entries(INDIAN_STATES).map(([code, name]) => ({
                  value: code,
                  label: `${code} - ${name}`,
                }))}
                placeholder="Select state"
                searchPlaceholder="Search states..."
              />
            </div>
            <div className="space-y-2">
              <Label>Place of Supply</Label>
              <Input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} />
              <CharCount current={placeOfSupply.length} max={255} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <SearchableSelect
                value={status}
                onValueChange={(v) => setStatus(v as Invoice["status"])}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "sent", label: "Sent" },
                  { value: "paid", label: "Paid" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                placeholder="Select status"
                searchPlaceholder="Search..."
              />
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
              <CharCount current={customerName.length} max={255} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              <CharCount current={customerEmail.length} max={255} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Address</Label>
              <Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} />
              <CharCount current={customerAddress.length} max={500} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              <CharCount current={customerPhone.length} max={50} />
            </div>
            <div className="space-y-2">
              <Label>PIN Code</Label>
              <Input value={customerPin} onChange={(e) => setCustomerPin(e.target.value)} />
              <CharCount current={customerPin.length} max={20} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={customerState} onChange={(e) => setCustomerState(e.target.value)} />
              <CharCount current={customerState.length} max={100} />
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
                <TableHead className="w-[250px]">Item</TableHead>
                <TableHead className="w-[80px]">Qty</TableHead>
                <TableHead className="w-[120px]">Original Rate</TableHead>
                <TableHead className="w-[120px]">Rate (INR)</TableHead>
                <TableHead className="w-[160px]">HSN Code</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Taxable Val</TableHead>
                <TableHead>CGST</TableHead>
                <TableHead>SGST</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemRows.map((row, idx) => {
                const rowKey = `item-${idx}`;
                const computed =
                  row.name && row.rate
                    ? calculateInvoiceItem(
                        row.name,
                        Number.parseFloat(row.quantity) || 1,
                        Number.parseFloat(row.rate) || 0,
                        Number.parseFloat(row.originalRate) || Number.parseFloat(row.rate) || 0,
                        row.hsn,
                        row.cgstPercent,
                        row.sgstPercent,
                      )
                    : null;
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
                    <TableCell>
                      <SearchableSelect
                        className="w-[160px]"
                        value={row.hsnCodeId || "custom"}
                        onValueChange={(value) => {
                          if (value === "custom") {
                            setItemRows((prev) =>
                              prev.map((r, i) =>
                                i === idx
                                  ? {
                                      ...r,
                                      hsnCodeId: "",
                                      hsn: DEFAULT_HSN_CODE,
                                      cgstPercent: DEFAULT_CGST_RATE,
                                      sgstPercent: DEFAULT_SGST_RATE,
                                    }
                                  : r,
                              ),
                            );
                          } else {
                            const selected = hsnCodes.find((h) => h.$id === value);
                            if (selected) {
                              setItemRows((prev) =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? {
                                        ...r,
                                        hsnCodeId: selected.$id,
                                        hsn: selected.code,
                                        cgstPercent: selected.cgstPercent,
                                        sgstPercent: selected.sgstPercent,
                                      }
                                    : r,
                                ),
                              );
                            }
                          }
                        }}
                        options={[
                          { value: "custom", label: "Custom" },
                          ...hsnCodes.map((h) => ({
                            value: h.$id,
                            label: `${h.code} (${h.cgstPercent + h.sgstPercent}%)`,
                          })),
                        ]}
                        placeholder="Select HSN"
                        searchPlaceholder="Search HSN..."
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.cgstPercent + row.sgstPercent}%
                    </TableCell>
                    <TableCell className="text-sm">{computed ? formatRs(computed.taxableValue) : "-"}</TableCell>
                    <TableCell className="text-sm">
                      {computed ? `${formatRs(computed.cgst)} (${row.cgstPercent}%)` : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {computed ? `${formatRs(computed.sgst)} (${row.sgstPercent}%)` : "-"}
                    </TableCell>
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
          <CardTitle>Tax Breakdown (per HSN)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HSN/SAC</TableHead>
                <TableHead>Taxable Value</TableHead>
                <TableHead>CGST Rate</TableHead>
                <TableHead>CGST Amount</TableHead>
                <TableHead>SGST Rate</TableHead>
                <TableHead>SGST Amount</TableHead>
                <TableHead>Total Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const hsnMap = new Map<
                  string,
                  { taxable: number; cgstRate: number; sgstRate: number; cgst: number; sgst: number }
                >();
                for (const item of computedItems) {
                  const key = item.hsn;
                  const existing = hsnMap.get(key);
                  if (existing) {
                    existing.taxable += item.taxableValue;
                    existing.cgst += item.cgst;
                    existing.sgst += item.sgst;
                  } else {
                    hsnMap.set(key, {
                      taxable: item.taxableValue,
                      cgstRate: item.cgstPercent ?? DEFAULT_CGST_RATE,
                      sgstRate: item.sgstPercent ?? DEFAULT_SGST_RATE,
                      cgst: item.cgst,
                      sgst: item.sgst,
                    });
                  }
                }
                return Array.from(hsnMap.entries()).map(([hsn, data]) => (
                  <TableRow key={hsn}>
                    <TableCell className="font-mono">{hsn}</TableCell>
                    <TableCell>{formatRs(data.taxable)}</TableCell>
                    <TableCell>{data.cgstRate}%</TableCell>
                    <TableCell>{formatRs(data.cgst)}</TableCell>
                    <TableCell>{data.sgstRate}%</TableCell>
                    <TableCell>{formatRs(data.sgst)}</TableCell>
                    <TableCell className="font-medium">{formatRs(data.cgst + data.sgst)}</TableCell>
                  </TableRow>
                ));
              })()}
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
