"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import JsBarcode from "jsbarcode";
import { Minus, Plus, Printer, Search } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProducts } from "@/lib/appwrite/products";
import type { Product, VariantInventoryItem } from "@/lib/appwrite/types";
import { VPPA_LOGO_DATA_URI } from "@/lib/vppa-logo";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function parseVariants(raw: string | undefined | null): VariantInventoryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return [];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ------------------------------------------------------------------ */
/*  Barcode SVG component using JsBarcode                             */
/* ------------------------------------------------------------------ */

function BarcodeSVG({
  value,
  width = 1.5,
  height = 40,
  fontSize = 12,
}: {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width,
          height,
          displayValue: true,
          fontSize,
          margin: 2,
          textMargin: 2,
        });
      } catch {
        /* invalid barcode value */
      }
    }
  }, [value, width, height, fontSize]);

  return <svg ref={svgRef} />;
}

/* ------------------------------------------------------------------ */
/*  Sticker size type                                                  */
/* ------------------------------------------------------------------ */

type StickerSize = "50x100" | "50x50";

/* ------------------------------------------------------------------ */
/*  Single Sticker component                                           */
/* ------------------------------------------------------------------ */

interface StickerProps {
  product: Product;
  variant: VariantInventoryItem;
  stickerSize?: StickerSize;
}

function Sticker({ product, variant, stickerSize = "50x100" }: StickerProps) {
  const productUrl = `https://vppafashions.com/product/${product.$id}`;
  const websiteUrl = "https://vppafashions.com";
  // Ensure full 13-digit item code, pad with leading zeros if needed
  const rawCode = variant.itemCode || product.itemCode || "";
  const itemCode = rawCode.padStart(13, "0");

  if (stickerSize === "50x50") {
    return (
      <div
        className="sticker-unit"
        style={{
          width: "50mm",
          height: "50mm",
          border: "1px solid #ccc",
          padding: "2mm",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "Arial, Helvetica, sans-serif",
          boxSizing: "border-box",
          pageBreakInside: "avoid",
          backgroundColor: "#fff",
          overflow: "hidden",
        }}
      >
        {/* Top: Brand with logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5mm",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <img src={VPPA_LOGO_DATA_URI} alt="VPPA" style={{ width: "22px", height: "22px", objectFit: "contain" }} />
          <span
            style={{
              fontSize: "10pt",
              fontWeight: 800,
              letterSpacing: "0.5px",
              whiteSpace: "nowrap",
            }}
          >
            VPPA fashions
          </span>
        </div>

        {/* MRP + QR code row */}
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "0.5mm",
          }}
        >
          <div style={{ flex: 1, textAlign: "left" }}>
            <div
              style={{
                fontSize: "12pt",
                fontWeight: 800,
              }}
            >
              RS:
              {(product.originalPrice || product.price).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <QRCodeSVG value={productUrl} size={38} level="M" />
          </div>
        </div>

        {/* Product Name */}
        <div
          style={{
            fontSize: "8pt",
            fontWeight: 600,
            width: "100%",
            textAlign: "center",
            lineHeight: 1.2,
            overflow: "hidden",
            maxHeight: "20pt",
          }}
        >
          {product.name}
        </div>

        {/* Barcode (Item Code) */}
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <BarcodeSVG value={itemCode} width={1.5} height={30} fontSize={10} />
        </div>

        {/* Bottom row: website + MADE IN INDIA */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <span style={{ fontSize: "6pt", color: "#444", fontWeight: 600 }}>WWW.VPPAFASHIONS.COM</span>
          <span style={{ fontSize: "6pt", fontWeight: 700 }}>MADE IN INDIA</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="sticker-unit"
      style={{
        width: "50mm",
        height: "100mm",
        border: "1px solid #ccc",
        padding: "3mm",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "Arial, Helvetica, sans-serif",
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        backgroundColor: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Top: Brand with logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2mm",
          width: "100%",
          justifyContent: "center",
        }}
      >
        <img src={VPPA_LOGO_DATA_URI} alt="VPPA" style={{ width: "28px", height: "28px", objectFit: "contain" }} />
        <span
          style={{
            fontSize: "11pt",
            fontWeight: 800,
            letterSpacing: "1px",
            whiteSpace: "nowrap",
          }}
        >
          VPPA fashions
        </span>
      </div>

      {/* MRP + QR code row */}
      <div
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "1mm",
        }}
      >
        <div style={{ flex: 1, textAlign: "left" }}>
          <div
            style={{
              fontSize: "14pt",
              fontWeight: 800,
            }}
          >
            MRP {formatCurrency(product.originalPrice || product.price)}
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <QRCodeSVG value={productUrl} size={48} level="M" />
        </div>
      </div>

      {/* Color / Size */}
      <div
        style={{
          fontSize: "9pt",
          fontWeight: 600,
          marginTop: "1mm",
          width: "100%",
          textAlign: "center",
        }}
      >
        {variant.color} / {variant.size}
      </div>

      {/* Product Name */}
      <div
        style={{
          fontSize: "9pt",
          fontWeight: 700,
          marginTop: "1mm",
          width: "100%",
          textAlign: "center",
          lineHeight: 1.2,
          overflow: "hidden",
          maxHeight: "24pt",
        }}
      >
        {product.name}
      </div>

      {/* Barcode (Item Code) */}
      <div
        style={{
          marginTop: "1mm",
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <BarcodeSVG value={itemCode} width={1.5} height={38} fontSize={10} />
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: "7pt",
          color: "#444",
          marginTop: "1mm",
          width: "100%",
          textAlign: "center",
          lineHeight: 1.2,
          overflow: "hidden",
          maxHeight: "22pt",
        }}
      >
        {product.description
          ? product.description.length > 80
            ? `${product.description.slice(0, 80)}...`
            : product.description
          : ""}
      </div>

      {/* MADE IN INDIA */}
      <div
        style={{
          fontSize: "8pt",
          fontWeight: 700,
          letterSpacing: "0.5px",
          marginTop: "1mm",
        }}
      >
        MADE IN INDIA
      </div>

      {/* Bottom QR code (website) */}
      <div
        style={{
          marginTop: "1mm",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <QRCodeSVG value={websiteUrl} size={38} level="M" />
        <span style={{ fontSize: "6pt", color: "#666", marginTop: "0.5mm" }}>www.vppafashions.com</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Print-ready sheet                                                 */
/* ------------------------------------------------------------------ */

interface PrintItem {
  product: Product;
  variant: VariantInventoryItem;
  quantity: number;
}

function PrintSheet({ items, stickerSize }: { items: PrintItem[]; stickerSize: StickerSize }) {
  // Expand items by quantity
  const stickers: { product: Product; variant: VariantInventoryItem }[] = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      stickers.push({ product: item.product, variant: item.variant });
    }
  }

  // For 50x50: roll has 2 labels per row, so duplicate each sticker side by side
  if (stickerSize === "50x50") {
    return (
      <div
        className="print-sheet"
        style={{
          display: "block",
          padding: 0,
        }}
      >
        {stickers.map((s, i) => (
          <div
            key={`row-${i}`}
            className="sticker-row"
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100mm",
              height: "50mm",
              pageBreakAfter: "always",
            }}
          >
            <Sticker product={s.product} variant={s.variant} stickerSize={stickerSize} />
            <Sticker product={s.product} variant={s.variant} stickerSize={stickerSize} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="print-sheet"
      style={{
        display: "block",
        padding: 0,
      }}
    >
      {stickers.map((s, i) => (
        <Sticker key={`sticker-${i}`} product={s.product} variant={s.variant} stickerSize={stickerSize} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function StickerPrinterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<string>("");
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [stickerSize, setStickerSize] = useState<StickerSize>("50x100");
  const printRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await getProducts(500);
      setProducts(res.documents as Product[]);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // All variants across all products for search
  const allVariants = products.flatMap((p) => {
    const variants = parseVariants(p.variantInventory);
    return variants.map((v) => ({ product: p, variant: v }));
  });

  // Filter by item code search
  const filteredVariants = searchQuery.trim()
    ? allVariants.filter(
        (item) =>
          (item.variant.itemCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.product.itemCode || "").toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const selectedVariants = selectedProduct ? parseVariants(selectedProduct.variantInventory) : [];

  const currentVariant = selectedVariantIdx ? selectedVariants[Number.parseInt(selectedVariantIdx, 10)] : null;

  const handleAddToPrint = () => {
    if (!selectedProduct || !currentVariant) {
      toast.error("Select a product and variant first");
      return;
    }
    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    // Check if this variant is already in the print list
    const existingIdx = printItems.findIndex(
      (item) => item.product.$id === selectedProduct.$id && item.variant.itemCode === currentVariant.itemCode,
    );

    if (existingIdx >= 0) {
      const updated = [...printItems];
      updated[existingIdx].quantity += quantity;
      setPrintItems(updated);
    } else {
      setPrintItems([...printItems, { product: selectedProduct, variant: currentVariant, quantity }]);
    }

    toast.success(`Added ${quantity} sticker(s) for ${currentVariant.itemCode}`);
  };

  const handleRemoveItem = (idx: number) => {
    setPrintItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateQuantity = (idx: number, delta: number) => {
    setPrintItems((prev) => {
      const updated = [...prev];
      updated[idx].quantity = Math.max(1, updated[idx].quantity + delta);
      return updated;
    });
  };

  const handlePrint = () => {
    if (printItems.length === 0) {
      toast.error("Add items to print first");
      return;
    }
    window.print();
  };

  const totalStickers = printItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: ${stickerSize === "50x50" ? "100mm" : "50mm"};
          }
          .print-sheet {
            display: block !important;
            padding: 0 !important;
          }
          .sticker-row {
            display: flex !important;
            flex-direction: row !important;
            width: 100mm !important;
            height: 50mm !important;
            page-break-after: always !important;
            break-after: page !important;
            transform: rotate(180deg) !important;
            transform-origin: center center !important;
          }
          .sticker-row:last-child {
            page-break-after: auto !important;
          }
          .sticker-row .sticker-unit {
            page-break-after: avoid !important;
            break-after: avoid !important;
            border: none !important;
            margin: 0 !important;
            padding: 2mm !important;
          }
          .sticker-unit {
            page-break-after: always !important;
            break-after: page !important;
            border: none !important;
            margin: 0 !important;
            padding: 2mm !important;
            transform: rotate(180deg) !important;
            transform-origin: center center !important;
          }
          .sticker-unit:last-child {
            page-break-after: auto !important;
          }
          @page {
            size: ${stickerSize === "50x50" ? "100mm 50mm" : "50mm 100mm"};
            margin: 0;
          }
        }
      `}</style>

      <div className="@container/main flex flex-col gap-4 md:gap-6 print:hidden">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Sticker Printer</h1>
          <p className="text-muted-foreground text-sm">Generate and print product stickers</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left: Product / Variant selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Product Variant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sticker size selector */}
              <div className="space-y-2">
                <Label>Sticker Size</Label>
                <Select value={stickerSize} onValueChange={(v) => setStickerSize(v as StickerSize)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50x100">50mm × 100mm (Tall)</SelectItem>
                    <SelectItem value="50x50">50mm × 50mm (Square)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search by item code */}
              <div className="space-y-2">
                <Label>Search by Item Code or Product Name</Label>
                <div className="relative">
                  <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter item code or product name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Search results */}
              {searchQuery.trim() && (
                <div className="max-h-48 overflow-auto rounded border">
                  {loading ? (
                    <div className="p-3 text-center text-muted-foreground text-sm">Loading...</div>
                  ) : filteredVariants.length === 0 ? (
                    <div className="p-3 text-center text-muted-foreground text-sm">No variants found</div>
                  ) : (
                    <div className="divide-y">
                      {filteredVariants.slice(0, 20).map((item, i) => (
                        <button
                          type="button"
                          key={`search-${i}`}
                          className="w-full p-2 text-left text-sm hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedProduct(item.product);
                            const variants = parseVariants(item.product.variantInventory);
                            const idx = variants.findIndex((v) => v.itemCode === item.variant.itemCode);
                            setSelectedVariantIdx(idx >= 0 ? String(idx) : "0");
                            setSearchQuery("");
                          }}
                        >
                          <div className="font-medium">{item.product.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {item.variant.itemCode} &middot; {item.variant.color} / {item.variant.size} &middot;{" "}
                            {formatCurrency(item.product.price)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Or select from dropdown */}
              <div className="space-y-2">
                <Label>Or Select Product</Label>
                <Select
                  value={selectedProduct?.$id || ""}
                  onValueChange={(id) => {
                    const p = products.find((prod) => prod.$id === id);
                    setSelectedProduct(p || null);
                    setSelectedVariantIdx("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.$id} value={p.$id}>
                        {p.name} ({p.itemCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Variant selector */}
              {selectedProduct && selectedVariants.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Variant</Label>
                  <Select value={selectedVariantIdx} onValueChange={setSelectedVariantIdx}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose variant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedVariants.map((v, i) => (
                        <SelectItem key={`variant-${i}`} value={String(i)}>
                          {v.color} / {v.size} - {v.itemCode} (Stock: {v.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quantity + Add button */}
              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
                      className="w-20 text-center"
                    />
                    <Button variant="outline" size="icon" className="size-8" onClick={() => setQuantity((q) => q + 1)}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>
                <Button onClick={handleAddToPrint} disabled={!selectedProduct || !currentVariant}>
                  <Plus className="mr-2 size-4" />
                  Add to Print
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right: Sticker Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Sticker Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {selectedProduct && currentVariant ? (
                <div className="rounded-lg border bg-white p-2 shadow-sm">
                  {stickerSize === "50x50" ? (
                    <div style={{ display: "flex", flexDirection: "row", gap: 0 }}>
                      <Sticker product={selectedProduct} variant={currentVariant} stickerSize={stickerSize} />
                      <Sticker product={selectedProduct} variant={currentVariant} stickerSize={stickerSize} />
                    </div>
                  ) : (
                    <Sticker product={selectedProduct} variant={currentVariant} stickerSize={stickerSize} />
                  )}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
                  Select a product and variant to preview the sticker
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Print Queue */}
        {printItems.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                Print Queue ({totalStickers} sticker
                {totalStickers !== 1 ? "s" : ""})
              </CardTitle>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 size-4" />
                Print All
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Color / Size</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {printItems.map((item, idx) => (
                    <TableRow key={`print-item-${idx}`}>
                      <TableCell className="font-medium">{item.product.name}</TableCell>
                      <TableCell className="font-mono text-xs">{item.variant.itemCode}</TableCell>
                      <TableCell>
                        {item.variant.color} / {item.variant.size}
                      </TableCell>
                      <TableCell>{formatCurrency(item.product.price)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7"
                            onClick={() => handleUpdateQuantity(idx, -1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-8 text-center font-mono">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7"
                            onClick={() => handleUpdateQuantity(idx, 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(idx)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Hidden print area */}
      <div ref={printRef} className="print-area hidden print:block">
        <PrintSheet items={printItems} stickerSize={stickerSize} />
      </div>
    </>
  );
}
