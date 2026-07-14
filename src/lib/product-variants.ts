import type { Product, VariantInventoryItem } from "@/lib/appwrite/types";

const GENDER_CODE: Record<string, string> = { Men: "1", Women: "2", Unisex: "3", Kids: "4" };

const SIZE_CODE: Record<string, string> = {
  XS: "01",
  S: "02",
  M: "03",
  L: "04",
  XL: "05",
  XXL: "06",
  XXXL: "07",
  Free: "99",
  "Free Size": "99",
};

function getSizeCode(size: string): string {
  const upper = size.trim().toUpperCase();
  if (SIZE_CODE[upper]) return SIZE_CODE[upper];
  const num = Number.parseInt(size.trim(), 10);
  if (!Number.isNaN(num)) return String(num % 100).padStart(2, "0");
  return "00";
}

let colorCodeCounter = 1;
const colorCodeMap: Record<string, string> = {};

function getColorCode(color: string): string {
  const key = color.trim().toLowerCase();
  if (!colorCodeMap[key]) {
    colorCodeMap[key] = String(colorCodeCounter).padStart(2, "0");
    colorCodeCounter++;
  }
  return colorCodeMap[key];
}

export function initColorCodesFromProducts(products: Product[]) {
  colorCodeCounter = 1;
  const seen = new Set<string>();
  for (const p of products) {
    if (!p.colors) continue;
    for (const c of p.colors.split(",")) {
      const key = c.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        colorCodeMap[key] = String(colorCodeCounter).padStart(2, "0");
        colorCodeCounter++;
      }
    }
  }
}

export function generateVariantItemCode(productId: string, gender: string, size: string, color: string): string {
  const pid = productId.padStart(5, "0");
  const g = GENDER_CODE[gender] || "3";
  const s = getSizeCode(size);
  const c = getColorCode(color);
  return `${pid}${g}${s}${c}001`;
}

export function parseVariantInventory(raw: string | undefined | null): VariantInventoryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return [];
}

function splitList(value: string | undefined | null): string[] {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildVariantGrid(
  sizes: string,
  colors: string,
  existing: VariantInventoryItem[],
  productId: string,
  gender: string,
): VariantInventoryItem[] {
  const sizeList = splitList(sizes);
  const colorList = splitList(colors);

  if (sizeList.length === 0 && colorList.length === 0) {
    if (!productId.trim()) return existing;
    return [
      {
        size: "Free Size",
        color: "Standard",
        stock: existing[0]?.stock ?? 0,
        itemCode: productId.trim().padStart(13, "0"),
      },
    ];
  }

  const effectiveSizes = sizeList.length > 0 ? sizeList : ["Free Size"];
  const effectiveColors = colorList.length > 0 ? colorList : ["Standard"];
  const grid: VariantInventoryItem[] = [];

  for (const size of effectiveSizes) {
    for (const color of effectiveColors) {
      const found = existing.find(
        (v) => v.size.toLowerCase() === size.toLowerCase() && v.color.toLowerCase() === color.toLowerCase(),
      );
      const itemCode = generateVariantItemCode(productId, gender, size, color);
      grid.push({ size, color, stock: found?.stock ?? 0, itemCode });
    }
  }

  return grid;
}

export function getProductVariants(product: Product, allProducts?: Product[]): VariantInventoryItem[] {
  const saved = parseVariantInventory(product.variantInventory);
  if (saved.length > 0) return saved;

  if (allProducts?.length) initColorCodesFromProducts(allProducts);

  return buildVariantGrid(product.sizes, product.colors, [], product.itemCode, product.gender || "Unisex");
}

export function totalVariantStock(variants: VariantInventoryItem[]): number {
  return variants.reduce((sum, v) => sum + (v.stock || 0), 0);
}

export function getNextProductId(products: Product[]): string {
  let max = 99;
  for (const p of products) {
    const code = p.itemCode || "";
    const num = Number.parseInt(code, 10);
    if (!Number.isNaN(num) && num > max) max = num;
  }
  return String(max + 1).padStart(5, "0");
}
