import type { Product } from "@/lib/appwrite/types";

export interface PricingCsvRow {
  rowNumber: number;
  productId: string;
  itemCode: string;
  sku: string;
  productName: string;
  gender: string;
  collection: string;
  productType: string;
  sellingPrice: string;
  mrp: string;
}

export interface PricingExportRow {
  productId: string;
  itemCode: string;
  sku: string;
  productName: string;
  gender: string;
  collection: string;
  productType: string;
  sellingPrice: number;
  mrp: number;
}

export const PRICING_CSV_HEADERS = [
  "Product ID",
  "Item Code",
  "SKU",
  "Product Name",
  "Gender",
  "Collection",
  "Product Type",
  "Selling Price",
  "MRP",
] as const;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normaliseHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function displayGender(value: unknown): string {
  const gender = text(value).toLowerCase();
  return gender ? `${gender.charAt(0).toUpperCase()}${gender.slice(1)}` : "";
}

export function displayCollection(value: unknown): string {
  return text(value)
    .replace(/_men$|_women$/i, "")
    .toLowerCase();
}

export function productToPricingRow(product: Product): PricingExportRow {
  const sellingPrice = Number(product.price);
  const productMrp = Number(product.originalPrice);

  return {
    productId: product.$id,
    itemCode: text(product.itemCode),
    sku: text(product.sku),
    productName: text(product.name),
    gender: displayGender(product.gender),
    collection: displayCollection(product.collectionSlug),
    productType: text(product.productType),
    sellingPrice: Number.isFinite(sellingPrice) ? sellingPrice : 0,
    mrp: Number.isFinite(productMrp) && productMrp > 0 ? productMrp : sellingPrice,
  };
}

function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const source = csv.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (quoted) {
      if (character === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"' && value.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  return rows;
}

export function parsePricingCsv(csv: string): { rows: PricingCsvRow[]; errors: string[] } {
  const rows = parseRows(csv);
  if (rows.length === 0) {
    return { rows: [], errors: ["The CSV file is empty."] };
  }

  const headerIndexes = new Map(rows[0].map((header, index) => [normaliseHeader(header), index]));
  const indexOf = (...names: string[]) =>
    names
      .map(normaliseHeader)
      .map((name) => headerIndexes.get(name))
      .find((index) => index !== undefined);
  const productIdIndex = indexOf("Product ID", "ProductId");
  const itemCodeIndex = indexOf("Item Code", "ItemCode");
  const sellingPriceIndex = indexOf("Selling Price", "SellingPrice", "Price");
  const mrpIndex = indexOf("MRP", "Original Price", "OriginalPrice");
  const errors: string[] = [];

  if (productIdIndex === undefined && itemCodeIndex === undefined) {
    errors.push('The CSV must include a "Product ID" or "Item Code" column.');
  }
  if (sellingPriceIndex === undefined) errors.push('The CSV must include a "Selling Price" column.');
  if (mrpIndex === undefined) errors.push('The CSV must include an "MRP" column.');
  if (errors.length > 0) return { rows: [], errors };

  const optionalIndex = (...names: string[]) => indexOf(...names);
  const skuIndex = optionalIndex("SKU");
  const productNameIndex = optionalIndex("Product Name", "Name");
  const genderIndex = optionalIndex("Gender");
  const collectionIndex = optionalIndex("Collection", "Collection Slug", "CollectionSlug");
  const productTypeIndex = optionalIndex("Product Type", "ProductType");
  const get = (cells: string[], index: number | undefined) => (index === undefined ? "" : text(cells[index]));

  return {
    rows: rows.slice(1).map((cells, index) => ({
      rowNumber: index + 2,
      productId: get(cells, productIdIndex),
      itemCode: get(cells, itemCodeIndex),
      sku: get(cells, skuIndex),
      productName: get(cells, productNameIndex),
      gender: get(cells, genderIndex),
      collection: get(cells, collectionIndex),
      productType: get(cells, productTypeIndex),
      sellingPrice: get(cells, sellingPriceIndex),
      mrp: get(cells, mrpIndex),
    })),
    errors,
  };
}

function csvCell(value: unknown): string {
  const cell = text(value);
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

export function pricingRowsToCsv(rows: PricingExportRow[]): string {
  const lines = [PRICING_CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.productId,
        row.itemCode,
        row.sku,
        row.productName,
        row.gender,
        row.collection,
        row.productType,
        row.sellingPrice,
        row.mrp,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}
