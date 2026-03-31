import type { InvoiceItem } from "./appwrite/types";

const COMPANY = {
  name: "VPPA fashions",
  address: "VPPA fashions no.161\\1 100 Feet Road Sir M Vishveswaraya Layout Jnana Ganga Nagar",
  phone: "9071691999",
  email: "vppafashions@gmail.com",
  gstin: "29DLFPG6129H1ZY",
};

const GST_RATE = 5;
const CGST_RATE = 2.5;
const SGST_RATE = 2.5;
const HSN_CODE = "60062200";

export { COMPANY, GST_RATE, CGST_RATE, SGST_RATE, HSN_CODE };

function numberToWords(num: number): string {
  if (num === 0) return "ZERO RUPEES ONLY";

  const ones = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim();
    if (n < 1000) return `${ones[Math.floor(n / 100)]} HUNDRED ${convert(n % 100)}`.trim();
    if (n < 100000) return `${convert(Math.floor(n / 1000))} THOUSAND ${convert(n % 1000)}`.trim();
    if (n < 10000000) return `${convert(Math.floor(n / 100000))} LAKH ${convert(n % 100000)}`.trim();
    return `${convert(Math.floor(n / 10000000))} CRORE ${convert(n % 10000000)}`.trim();
  };

  const rounded = Math.round(num);
  return `${convert(rounded)} RUPEES ONLY`;
}

export function calculateInvoiceItem(name: string, quantity: number, rate: number, originalRate: number): InvoiceItem {
  const taxableValue = Number(((rate * quantity) / (1 + GST_RATE / 100)).toFixed(2));
  const cgst = Number((taxableValue * (CGST_RATE / 100)).toFixed(2));
  const sgst = Number((taxableValue * (SGST_RATE / 100)).toFixed(2));
  const total = rate * quantity;

  return {
    name,
    quantity,
    rate,
    originalRate,
    hsn: HSN_CODE,
    gstPercent: GST_RATE,
    taxableValue,
    cgst,
    sgst,
    total,
  };
}

export function calculateInvoiceTotals(items: InvoiceItem[], shippingAmount: number, discount: number) {
  const subtotal = items.reduce((sum, item) => sum + item.rate * item.quantity, 0);
  const taxableAmount = items.reduce((sum, item) => sum + item.taxableValue, 0);
  const cgstAmount = items.reduce((sum, item) => sum + item.cgst, 0);
  const sgstAmount = items.reduce((sum, item) => sum + item.sgst, 0);
  const totalTax = cgstAmount + sgstAmount;
  const totalAfterTax = taxableAmount + totalTax;
  const grandTotal = totalAfterTax + shippingAmount - discount;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxableAmount: Number(taxableAmount.toFixed(2)),
    cgstAmount: Number(cgstAmount.toFixed(2)),
    sgstAmount: Number(sgstAmount.toFixed(2)),
    totalTax: Number(totalTax.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };
}

export { numberToWords };
