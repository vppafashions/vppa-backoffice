import type { InvoiceItem } from "./appwrite/types";
import { VPPA_LOGO_DATA_URI } from "./vppa-logo";

const COMPANY = {
  name: "VPPA FASHIONS",
  address:
    "No.161/1, Ground Floor, 100 Feet Rd, 3rd Block, Sir M Vishveswaraya Layout, Ullal, Bengaluru, Karnataka 560110",
  phone: "9071691999",
  email: "vppafashions@gmail.com",
  gstin: "29DLFPG6129H1ZY",
  logo: VPPA_LOGO_DATA_URI,
};

const DEFAULT_GST_RATE = 5;
const DEFAULT_CGST_RATE = 2.5;
const DEFAULT_SGST_RATE = 2.5;
const DEFAULT_HSN_CODE = "60062200";

export { COMPANY, DEFAULT_CGST_RATE, DEFAULT_GST_RATE, DEFAULT_HSN_CODE, DEFAULT_SGST_RATE };

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

export function calculateInvoiceItem(
  name: string,
  quantity: number,
  rate: number,
  originalRate: number,
  hsn?: string,
  cgstPercent?: number,
  sgstPercent?: number,
): InvoiceItem {
  const itemCgstRate = cgstPercent ?? DEFAULT_CGST_RATE;
  const itemSgstRate = sgstPercent ?? DEFAULT_SGST_RATE;
  const itemGstRate = itemCgstRate + itemSgstRate;
  const itemHsn = hsn || DEFAULT_HSN_CODE;

  const total = rate * quantity;
  const taxableValue = Math.round((total / (1 + itemGstRate / 100)) * 100) / 100;
  const totalItemTax = Math.round((total - taxableValue) * 100) / 100;
  const cgst = Math.round((totalItemTax / 2) * 100) / 100;
  const sgst = Math.round((totalItemTax - cgst) * 100) / 100;

  return {
    name,
    quantity,
    rate,
    originalRate,
    hsn: itemHsn,
    gstPercent: itemGstRate,
    cgstPercent: itemCgstRate,
    sgstPercent: itemSgstRate,
    taxableValue,
    cgst,
    sgst,
    total,
  };
}

export type BillDiscountMode = "flat" | "percentage" | "finalPayable";

/** Resolve bill discount in INR from flat / % / final-payable input. */
export function computeBillDiscountInr(options: {
  mode: BillDiscountMode;
  value: number;
  itemsSubtotal: number;
  shippingAmount: number;
}): number {
  const { mode, value, itemsSubtotal, shippingAmount } = options;
  if (itemsSubtotal <= 0 || !Number.isFinite(value) || value < 0) return 0;

  switch (mode) {
    case "flat":
      return Math.round(Math.min(value, itemsSubtotal) * 100) / 100;
    case "percentage": {
      const pct = Math.min(value, 100);
      return Math.round(itemsSubtotal * (pct / 100) * 100) / 100;
    }
    case "finalPayable": {
      // 0 / empty means "no target set" — do not treat as pay-nothing.
      if (value <= 0) return 0;
      // Target is what the customer pays (items after discount + shipping).
      const maxPayable = itemsSubtotal + shippingAmount;
      const target = Math.min(value, maxPayable);
      const targetItemsTotal = Math.max(0, target - shippingAmount);
      return Math.round(Math.max(0, itemsSubtotal - targetItemsTotal) * 100) / 100;
    }
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/**
 * Apply an inclusive bill discount proportionally across lines, then rebuild
 * taxable / CGST / SGST so GST falls with the discount (pre-tax style).
 */
export function withPreTaxBillDiscount(items: InvoiceItem[], discountInr: number): InvoiceItem[] {
  if (items.length === 0 || discountInr <= 0) return items;

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  if (subtotal <= 0) return items;

  const clamped = Math.min(discountInr, subtotal);
  let allocated = 0;

  return items.map((item, index) => {
    const isLast = index === items.length - 1;
    const share = isLast
      ? Math.round((clamped - allocated) * 100) / 100
      : Math.round(clamped * (item.total / subtotal) * 100) / 100;
    if (!isLast) allocated = Math.round((allocated + share) * 100) / 100;

    const newTotal = Math.max(0, Math.round((item.total - share) * 100) / 100);
    const gstRate = item.gstPercent || item.cgstPercent + item.sgstPercent;
    const taxableValue = Math.round((newTotal / (1 + gstRate / 100)) * 100) / 100;
    const totalItemTax = Math.round((newTotal - taxableValue) * 100) / 100;
    const cgst = Math.round((totalItemTax / 2) * 100) / 100;
    const sgst = Math.round((totalItemTax - cgst) * 100) / 100;

    return {
      ...item,
      taxableValue,
      cgst,
      sgst,
      total: newTotal,
    };
  });
}

export function calculateInvoiceTotals(items: InvoiceItem[], shippingAmount: number, discount: number) {
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.rate * item.quantity, 0) * 100) / 100;
  const discountInr = Math.min(Math.max(0, discount), subtotal);
  const discountedItems = withPreTaxBillDiscount(items, discountInr);

  const taxableAmount = Math.round(discountedItems.reduce((sum, item) => sum + item.taxableValue, 0) * 100) / 100;
  const cgstAmount = Math.round(discountedItems.reduce((sum, item) => sum + item.cgst, 0) * 100) / 100;
  const sgstAmount = Math.round(discountedItems.reduce((sum, item) => sum + item.sgst, 0) * 100) / 100;
  const totalTax = Math.round((cgstAmount + sgstAmount) * 100) / 100;
  // Discount is pre-tax: GST is on the reduced amount, then add shipping (0% GST).
  const grandTotal = Math.round((subtotal - discountInr + shippingAmount) * 100) / 100;

  return {
    subtotal,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    totalTax,
    grandTotal,
    discount: discountInr,
    discountedItems,
  };
}

export { numberToWords };
