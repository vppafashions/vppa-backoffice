"use client";

import { useRef } from "react";

import { Download, Printer, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Invoice, InvoiceItem } from "@/lib/appwrite/types";
import { COMPANY, DEFAULT_CGST_RATE, DEFAULT_SGST_RATE, numberToWords } from "@/lib/invoice-pdf";
import { VPPA_LOGO_DATA_URI } from "@/lib/vppa-logo";

interface InvoicePdfViewProps {
  invoice: Invoice;
  onBack: () => void;
}

export default function InvoicePdfView({ invoice, onBack }: InvoicePdfViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  let items: InvoiceItem[] = [];
  try {
    items = JSON.parse(invoice.items);
  } catch {
    items = [];
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "2-digit" });
  };

  const formatRs = (amount: number) => `Rs. ${amount.toFixed(2)}`;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tax Invoice #${invoice.invoiceNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm 12mm 15mm 12mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: 210mm;
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #000;
            background: #fff;
          }
          body { padding: 15mm 12mm; }
          table { width: 100%; border-collapse: collapse; }
          td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
          .no-border td, .no-border th { border: none; }
          .header { display: flex; justify-content: space-between; align-items: center; border: 1px solid #000; border-bottom: none; padding: 10px; }
          .header-left { display: flex; align-items: center; gap: 20px; }
          .header h1 { font-size: 18px; font-weight: bold; }
          .header .original { font-weight: bold; font-size: 14px; }
          .logo { width: 60px; height: 60px; }
          .company-section { border: 1px solid #000; border-bottom: none; padding: 8px; }
          .bold { font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .footer { text-align: center; margin-top: 10px; font-size: 10px; }
          .amount-words { font-weight: bold; padding: 4px 6px; border: 1px solid #000; border-top: none; }
          .strike { text-decoration: line-through; }
          @media print {
            html, body { width: auto; padding: 0; }
            .no-print { display: none !important; }
          }
          @media screen {
            body {
              max-width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handlePrintThermal = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsHtml = items
      .map(
        (item) =>
          `<tr>
            <td style="padding:2px 0;font-size:11px;border-bottom:1px dashed #ccc;">${item.name}</td>
            <td style="padding:2px 4px;font-size:11px;text-align:center;border-bottom:1px dashed #ccc;">${item.quantity}</td>
            <td style="padding:2px 0;font-size:11px;text-align:right;border-bottom:1px dashed #ccc;">${item.rate.toFixed(2)}</td>
            <td style="padding:2px 0;font-size:11px;text-align:right;border-bottom:1px dashed #ccc;">${item.total.toFixed(2)}</td>
          </tr>`,
      )
      .join("");

    const hsnMap = new Map<
      string,
      { cgstRate: number; sgstRate: number; taxable: number; cgst: number; sgst: number }
    >();
    for (const it of items) {
      const key = it.hsn;
      const existing = hsnMap.get(key);
      if (existing) {
        existing.taxable += it.taxableValue;
        existing.cgst += it.cgst;
        existing.sgst += it.sgst;
      } else {
        hsnMap.set(key, {
          cgstRate: it.cgstPercent ?? DEFAULT_CGST_RATE,
          sgstRate: it.sgstPercent ?? DEFAULT_SGST_RATE,
          taxable: it.taxableValue,
          cgst: it.cgst,
          sgst: it.sgst,
        });
      }
    }

    const taxLines = Array.from(hsnMap.entries())
      .map(
        ([hsn, data]) =>
          `<tr>
            <td style="font-size:10px;padding:1px 0;">${hsn}</td>
            <td style="font-size:10px;padding:1px 0;text-align:right;">${data.taxable.toFixed(2)}</td>
            <td style="font-size:10px;padding:1px 0;text-align:right;">${data.cgstRate}%</td>
            <td style="font-size:10px;padding:1px 0;text-align:right;">${data.cgst.toFixed(2)}</td>
            <td style="font-size:10px;padding:1px 0;text-align:right;">${data.sgstRate}%</td>
            <td style="font-size:10px;padding:1px 0;text-align:right;">${data.sgst.toFixed(2)}</td>
          </tr>`,
      )
      .join("");

    const totalAfterTaxThermal = invoice.taxableAmount + invoice.totalTax;
    const totalShippingThermal = invoice.shippingAmount || 0;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill #${invoice.invoiceNumber}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: 80mm;
            max-width: 80mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
          body { padding: 3mm; }
          .receipt-wrapper {
            width: 76mm;
            max-width: 76mm;
            margin: 0 auto;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .separator { border-top: 1px dashed #000; margin: 4px 0; }
          .separator-double { border-top: 2px solid #000; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; }
          .tip-bar {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffc107;
            border-radius: 4px;
            padding: 8px 12px;
            margin-bottom: 12px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
          }
          @media print {
            html, body { width: 80mm; max-width: 80mm; padding: 0; margin: 0; }
            .receipt-wrapper { width: 76mm; max-width: 76mm; }
            .tip-bar { display: none !important; }
          }
          @media screen {
            html, body { width: auto; max-width: 100%; }
            .receipt-wrapper {
              width: 80mm;
              max-width: 80mm;
              margin: 0 auto;
              padding: 4mm;
              box-shadow: 0 0 10px rgba(0,0,0,0.15);
              background: #fff;
            }
            body {
              background: #f5f5f5;
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="tip-bar">
          <strong>Tip:</strong> Select your <strong>thermal printer</strong> (not "Microsoft Print to PDF") in the Destination dropdown. Paper size will be set to 80mm automatically. If printing to PDF, the receipt will appear on the left side of the page.
        </div>
        <div class="receipt-wrapper">
        <!-- Logo & Header -->
        <div class="center">
          <img src="${VPPA_LOGO_DATA_URI}" alt="VPPA" style="width:40px;height:40px;" />
          <div class="bold" style="font-size:14px;margin-top:2px;">${COMPANY.name}</div>
          <div style="font-size:9px;margin-top:2px;">${COMPANY.address}</div>
          <div style="font-size:9px;">Tel: ${COMPANY.phone} | ${COMPANY.email}</div>
          <div style="font-size:9px;">GSTIN: ${COMPANY.gstin}</div>
        </div>

        <div class="separator-double"></div>
        <div class="center bold" style="font-size:13px;">TAX INVOICE</div>
        <div class="separator"></div>

        <!-- Invoice Meta -->
        <table style="font-size:10px;">
          <tr><td>Bill No:</td><td class="right">${invoice.invoiceNumber}</td></tr>
          <tr><td>Date:</td><td class="right">${formatDate(invoice.invoiceDate)}</td></tr>
          ${invoice.orderNumber ? `<tr><td>Order:</td><td class="right">${invoice.orderNumber}</td></tr>` : ""}
          ${invoice.modeOfTransport && invoice.modeOfTransport !== "-" ? `<tr><td>Transport:</td><td class="right">${invoice.modeOfTransport}</td></tr>` : ""}
        </table>

        <div class="separator"></div>

        <!-- Customer -->
        <div style="font-size:10px;">
          <span class="bold">To: ${invoice.customerName}</span>
          ${invoice.customerAddress ? `<br/>${invoice.customerAddress}` : ""}
          ${invoice.customerState ? `<br/>${invoice.customerState}${invoice.customerPin ? " - " + invoice.customerPin : ""}` : ""}
          ${invoice.customerPhone ? `<br/>Tel: ${invoice.customerPhone}` : ""}
        </div>

        <div class="separator"></div>

        <!-- Items -->
        <table>
          <tr style="border-bottom:1px solid #000;">
            <th style="text-align:left;font-size:10px;padding:2px 0;">Item</th>
            <th style="text-align:center;font-size:10px;padding:2px 4px;">Qty</th>
            <th style="text-align:right;font-size:10px;padding:2px 0;">Rate</th>
            <th style="text-align:right;font-size:10px;padding:2px 0;">Amt</th>
          </tr>
          ${itemsHtml}
        </table>

        <div class="separator-double"></div>

        <!-- Totals -->
        <table style="font-size:11px;">
          <tr><td>Subtotal:</td><td class="right">${invoice.subtotal.toFixed(2)}</td></tr>
          <tr><td>Taxable Amount:</td><td class="right">${invoice.taxableAmount.toFixed(2)}</td></tr>
          <tr><td>CGST:</td><td class="right">${invoice.cgstAmount.toFixed(2)}</td></tr>
          <tr><td>SGST:</td><td class="right">${invoice.sgstAmount.toFixed(2)}</td></tr>
          <tr><td>Total Tax:</td><td class="right">${invoice.totalTax.toFixed(2)}</td></tr>
          ${totalShippingThermal > 0 ? `<tr><td>Shipping:</td><td class="right">${totalShippingThermal.toFixed(2)}</td></tr>` : ""}
          ${invoice.discount > 0 ? `<tr><td>Discount:</td><td class="right">-${invoice.discount.toFixed(2)}</td></tr>` : ""}
        </table>

        <div class="separator-double"></div>

        <table style="font-size:13px;">
          <tr class="bold"><td>GRAND TOTAL:</td><td class="right">Rs. ${invoice.grandTotal.toFixed(2)}</td></tr>
        </table>

        <div class="separator"></div>

        <!-- HSN Tax Summary -->
        <div class="center bold" style="font-size:9px;margin:2px 0;">GST SUMMARY</div>
        <table>
          <tr style="border-bottom:1px solid #000;">
            <th style="font-size:8px;text-align:left;padding:1px 0;">HSN</th>
            <th style="font-size:8px;text-align:right;padding:1px 0;">Taxable</th>
            <th style="font-size:8px;text-align:right;padding:1px 0;">C%</th>
            <th style="font-size:8px;text-align:right;padding:1px 0;">CGST</th>
            <th style="font-size:8px;text-align:right;padding:1px 0;">S%</th>
            <th style="font-size:8px;text-align:right;padding:1px 0;">SGST</th>
          </tr>
          ${taxLines}
        </table>

        <div class="separator"></div>

        <div class="center" style="font-size:9px;margin-top:4px;">
          <p>Thank you for shopping with us!</p>
          <p style="margin-top:2px;">www.vppafashions.com</p>
        </div>

        <div style="margin-top:8px;"></div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const totalAfterTax = invoice.taxableAmount + invoice.totalTax;
  const totalShipping = invoice.shippingAmount || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Invoices
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrintThermal}>
            <Receipt className="mr-2 size-4" />
            Print Bill (80mm)
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 size-4" />
            Print / PDF
          </Button>
          <Button onClick={handlePrint}>
            <Download className="mr-2 size-4" />
            Download
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-[800px] rounded-lg border bg-white p-0 shadow-sm" ref={printRef}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            border: "1px solid #000",
            padding: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={VPPA_LOGO_DATA_URI} alt="VPPA" style={{ width: 60, height: 60, objectFit: "contain" }} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: "bold", fontFamily: "Arial" }}>TAX INVOICE</h1>
          </div>
          <span style={{ fontWeight: "bold", fontSize: 14 }}>ORIGINAL</span>
        </div>

        {/* Company + Invoice meta */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td
                rowSpan={6}
                style={{ border: "1px solid #000", padding: "6px", width: "50%", verticalAlign: "top", fontSize: 11 }}
              >
                <strong>{COMPANY.name}</strong>
                <br />
                {COMPANY.address}
                <br />
                Tel: {COMPANY.phone}
                <br />
                Email: {COMPANY.email}
                <br />
                GSTIN: {COMPANY.gstin}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: 11 }}>
                <strong>Invoice No:</strong> {invoice.invoiceNumber}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: 11 }}>
                <strong>Mode of Transport:</strong> {invoice.modeOfTransport || "-"}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: 11 }}>
                <strong>Invoice Date:</strong> {formatDate(invoice.invoiceDate)}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: 11 }}>
                <strong>Date of Supply:</strong> {formatDate(invoice.invoiceDate)}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: 11 }} />
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: 11 }}>
                <strong>Place of Supply:</strong> {invoice.placeOfSupply || "-"}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: 11 }}>
                <strong>Order No:</strong> {invoice.orderNumber || `#VPPA${invoice.invoiceNumber}IN`}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: 11 }}>
                <strong>State Code:</strong> {invoice.stateCode || "-"}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: 11 }}>
                <strong>Order Date:</strong> {formatDate(invoice.orderDate || invoice.invoiceDate)}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: 11 }} />
            </tr>
          </tbody>
        </table>

        {/* Billed To / Ship To */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td
                style={{ border: "1px solid #000", padding: "6px", width: "50%", verticalAlign: "top", fontSize: 11 }}
              >
                <strong>Billed To</strong>
                <br />
                <br />
                <strong>{invoice.customerName}</strong>
                <br />
                {invoice.customerAddress && (
                  <>
                    {invoice.customerAddress}
                    <br />
                  </>
                )}
                {invoice.customerState && (
                  <>
                    {invoice.customerState}, Pin: {invoice.customerPin}, {invoice.customerState}, India
                    <br />
                  </>
                )}
                {invoice.customerPhone && (
                  <>
                    Tel: {invoice.customerPhone}
                    <br />
                  </>
                )}
                {invoice.customerEmail && <>Email: {invoice.customerEmail}</>}
              </td>
              <td
                style={{ border: "1px solid #000", padding: "6px", width: "50%", verticalAlign: "top", fontSize: 11 }}
              >
                <strong>Ship To</strong>
                <br />
                <br />
                <strong>{invoice.customerName}</strong>
                <br />
                {invoice.customerAddress && (
                  <>
                    {invoice.customerAddress}
                    <br />
                  </>
                )}
                {invoice.customerState && (
                  <>
                    {invoice.customerState}, Pin: {invoice.customerPin}, {invoice.customerState}, India
                    <br />
                  </>
                )}
                {invoice.customerPhone && (
                  <>
                    Tel: 91{invoice.customerPhone}
                    <br />
                  </>
                )}
                {invoice.customerEmail && <>Email: {invoice.customerEmail}</>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "left" }}>Item</th>
              <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>Qty</th>
              <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>Rate</th>
              <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>Taxable Val</th>
              <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>HSN</th>
              <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>GST</th>
              <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>CGST</th>
              <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>SGST</th>
              <th style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.name}-${item.rate}-${item.quantity}`}>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{item.name}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{item.quantity}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                  {item.originalRate && item.originalRate !== item.rate ? (
                    <>
                      <span style={{ textDecoration: "line-through" }}>Rs. {item.originalRate.toFixed(2)}</span> Rs.{" "}
                      {item.rate.toFixed(2)}
                    </>
                  ) : (
                    <>Rs. {item.rate.toFixed(2)}</>
                  )}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                  {formatRs(item.taxableValue)}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{item.hsn}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>
                  {item.gstPercent}%
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                  {formatRs(item.cgst)}
                  <br />
                  <span style={{ fontSize: 9, color: "#666" }}>@{item.cgstPercent ?? DEFAULT_CGST_RATE}%</span>
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                  {formatRs(item.sgst)}
                  <br />
                  <span style={{ fontSize: 9, color: "#666" }}>@{item.sgstPercent ?? DEFAULT_SGST_RATE}%</span>
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                  {formatRs(item.total)}
                </td>
              </tr>
            ))}
            {/* Total row */}
            <tr style={{ fontWeight: "bold" }}>
              <td style={{ border: "1px solid #000", padding: "4px 6px" }}>Total</td>
              <td style={{ border: "1px solid #000", padding: "4px 6px" }} />
              <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                {formatRs(invoice.subtotal)}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                {formatRs(invoice.taxableAmount)}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 6px" }} />
              <td style={{ border: "1px solid #000", padding: "4px 6px" }} />
              <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                {formatRs(invoice.cgstAmount)}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                {formatRs(invoice.sgstAmount)}
              </td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                {formatRs(invoice.taxableAmount + invoice.totalTax)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words */}
        <div style={{ border: "1px solid #000", borderTop: "none", padding: "6px", fontSize: 11 }}>
          <strong>Amount in words</strong> {numberToWords(invoice.grandTotal)}
        </div>

        {/* Tax Summary + Totals Side by Side */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #000", padding: 0, width: "50%", verticalAlign: "top" }}>
                {/* Tax breakdown table */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>HSN/SAC</th>
                      <th colSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>
                        Central Tax
                      </th>
                      <th colSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>
                        State Tax
                      </th>
                      <th colSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>
                        Integrated Tax
                      </th>
                    </tr>
                    <tr>
                      <th style={{ border: "1px solid #000", padding: "3px" }} />
                      <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>Rate</th>
                      <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>Amount</th>
                      <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>Rate</th>
                      <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>Amount</th>
                      <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>Rate</th>
                      <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const hsnMap = new Map<
                        string,
                        { cgstRate: number; sgstRate: number; cgst: number; sgst: number }
                      >();
                      for (const it of items) {
                        const key = it.hsn;
                        const existing = hsnMap.get(key);
                        if (existing) {
                          existing.cgst += it.cgst;
                          existing.sgst += it.sgst;
                        } else {
                          hsnMap.set(key, {
                            cgstRate: it.cgstPercent ?? DEFAULT_CGST_RATE,
                            sgstRate: it.sgstPercent ?? DEFAULT_SGST_RATE,
                            cgst: it.cgst,
                            sgst: it.sgst,
                          });
                        }
                      }
                      return Array.from(hsnMap.entries()).map(([hsn, data]) => (
                        <tr key={hsn}>
                          <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{hsn}</td>
                          <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>
                            {data.cgstRate}%
                          </td>
                          <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>
                            {data.cgst.toFixed(2)}
                          </td>
                          <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>
                            {data.sgstRate}%
                          </td>
                          <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>
                            {data.sgst.toFixed(2)}
                          </td>
                          <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>0</td>
                          <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>0</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
                <div style={{ padding: "6px", fontSize: 10 }}>
                  <p>Terms and Conditions apply</p>
                  <br />
                  <p>E. &amp; O.E</p>
                </div>
              </td>
              <td style={{ border: "1px solid #000", padding: 0, width: "50%", verticalAlign: "top" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <tbody>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
                        <strong>Total Discount:</strong>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                        {formatRs(invoice.discount || 0)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
                        <strong>Total Amount before Tax:</strong>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                        {formatRs(invoice.taxableAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
                        <strong>Total Tax Amount:</strong>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                        {formatRs(invoice.totalTax)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
                        <strong>Total Amount After Tax:</strong>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                        {formatRs(totalAfterTax)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
                        <strong>Shipping Amount:</strong>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                        {formatRs(totalShipping)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
                        <strong>Shipping CGST (0%):</strong>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>Rs. 0.00</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
                        <strong>Shipping SGST (0%):</strong>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>Rs. 0.00</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
                        <strong>Total Shipping:</strong>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                        {formatRs(totalShipping)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
                        <strong>Round Off</strong>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>-</td>
                    </tr>
                    <tr style={{ fontWeight: "bold" }}>
                      <td style={{ border: "1px solid #000", padding: "4px 6px" }}>
                        <strong>Total</strong>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                        {formatRs(invoice.grandTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            padding: "12px",
            borderLeft: "1px solid #000",
            borderRight: "1px solid #000",
            borderBottom: "1px solid #000",
            fontSize: 10,
          }}
        >
          <p style={{ color: "red", marginBottom: 4 }}>
            This is computer generated invoice and hence no signature is required
          </p>
          <p>
            <strong>Powered By GST Pro</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
