"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProducts, updateProduct } from "@/lib/appwrite/products";
import type { Product } from "@/lib/appwrite/types";
import {
  displayCollection,
  type PricingCsvRow,
  parsePricingCsv,
  pricingRowsToCsv,
  productToPricingRow,
} from "@/lib/pricing-csv";

const PRODUCTS_PAGE_SIZE = 100;
const UPDATE_BATCH_SIZE = 8;

interface ValidatedUpdate {
  product: Product;
  row: PricingCsvRow;
  sellingPrice: number;
  mrp: number;
}

interface UploadState {
  fileName: string;
  totalRows: number;
  updates: ValidatedUpdate[];
  errors: string[];
}

interface PricingReviewRow {
  update: ValidatedUpdate;
  currentSellingPrice: number;
  currentMrp: number;
  sellingDelta: number;
  mrpDelta: number;
  hasChanges: boolean;
}

const emptyUpload: UploadState = {
  fileName: "",
  totalRows: 0,
  updates: [],
  errors: [],
};

function priceValue(value: string): number | null {
  const parsed = Number(value.replace(/[,₹\s]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDelta(value: number): string {
  if (value === 0) return "No change";
  return `${value > 0 ? "+" : "−"}${formatCurrency(Math.abs(value))}`;
}

async function loadAllProducts(): Promise<Product[]> {
  const products: Product[] = [];
  let offset = 0;

  while (true) {
    const response = await getProducts(PRODUCTS_PAGE_SIZE, offset);
    const page = response.documents as Product[];
    products.push(...page);

    if (page.length === 0 || page.length < PRODUCTS_PAGE_SIZE || products.length >= response.total) break;
    offset += page.length;
  }

  return products;
}

function validateRows(rows: PricingCsvRow[], products: Product[]): { updates: ValidatedUpdate[]; errors: string[] } {
  const byId = new Map(products.map((product) => [product.$id, product]));
  const byItemCode = new Map<string, Product[]>();
  for (const product of products) {
    const key = product.itemCode?.trim().toLowerCase();
    if (!key) continue;
    byItemCode.set(key, [...(byItemCode.get(key) || []), product]);
  }

  const updates: ValidatedUpdate[] = [];
  const errors: string[] = [];
  const seenProducts = new Set<string>();

  for (const row of rows) {
    const rowErrors: string[] = [];
    const itemCodeKey = row.itemCode.toLowerCase();
    let product = row.productId ? byId.get(row.productId) : undefined;

    if (!row.productId && !row.itemCode) rowErrors.push("Product ID or Item Code is required.");
    if (!product && itemCodeKey) {
      const matches = byItemCode.get(itemCodeKey) || [];
      if (matches.length > 1) rowErrors.push("Item Code matches more than one product.");
      if (matches.length === 1) product = matches[0];
    }
    if (!product) rowErrors.push("No matching product was found.");

    if (product && row.productId && row.itemCode && product.itemCode.trim().toLowerCase() !== itemCodeKey) {
      rowErrors.push("Product ID and Item Code refer to different products.");
    }
    if (product && seenProducts.has(product.$id)) rowErrors.push("The same product appears more than once.");

    const sellingPrice = priceValue(row.sellingPrice);
    const mrp = priceValue(row.mrp);
    if (sellingPrice === null) rowErrors.push("Selling Price must be a non-negative number.");
    if (mrp === null) rowErrors.push("MRP must be a non-negative number.");
    if (sellingPrice !== null && mrp !== null && sellingPrice > mrp) {
      rowErrors.push("Selling Price cannot be greater than MRP.");
    }

    if (rowErrors.length > 0 || !product || sellingPrice === null || mrp === null) {
      errors.push(`Row ${row.rowNumber}: ${rowErrors.join(" ")}`);
      continue;
    }

    seenProducts.add(product.$id);
    updates.push({ product, row, sellingPrice, mrp });
  }

  return { updates, errors };
}

export default function PricingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [upload, setUpload] = useState<UploadState>(emptyUpload);
  const [uploading, setUploading] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = useCallback(async () => {
    setRefreshing(true);
    try {
      setProducts(await loadAllProducts());
    } catch (error) {
      console.error("Failed to load pricing products:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load products");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  const genderOptions = useMemo(
    () => Array.from(new Set(products.map((product) => product.gender || "Unisex"))).sort(),
    [products],
  );
  const collectionOptions = useMemo(
    () =>
      Array.from(new Set(products.map((product) => displayCollection(product.collectionSlug)).filter(Boolean))).sort(),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((product) => {
        const matchesSearch =
          !query || [product.name, product.itemCode, product.sku].some((value) => value?.toLowerCase().includes(query));
        const matchesGender = genderFilter === "all" || (product.gender || "Unisex") === genderFilter;
        const matchesCollection =
          collectionFilter === "all" || displayCollection(product.collectionSlug) === collectionFilter;
        return matchesSearch && matchesGender && matchesCollection;
      })
      .sort((a, b) => (a.itemCode || a.name).localeCompare(b.itemCode || b.name, undefined, { numeric: true }));
  }, [collectionFilter, genderFilter, products, search]);

  const pricingReview = useMemo(() => {
    const rows: PricingReviewRow[] = upload.updates.map((update) => {
      const current = productToPricingRow(update.product);
      const sellingDelta = update.sellingPrice - current.sellingPrice;
      const mrpDelta = update.mrp - current.mrp;
      return {
        update,
        currentSellingPrice: current.sellingPrice,
        currentMrp: current.mrp,
        sellingDelta,
        mrpDelta,
        hasChanges: sellingDelta !== 0 || mrpDelta !== 0,
      };
    });
    const changedRows = rows.filter((row) => row.hasChanges);

    return {
      rows,
      changedRows,
      changedCount: changedRows.length,
      unchangedCount: rows.length - changedRows.length,
      sellingPriceChanges: rows.filter((row) => row.sellingDelta !== 0).length,
      mrpChanges: rows.filter((row) => row.mrpDelta !== 0).length,
      sellingDelta: rows.reduce((sum, row) => sum + row.sellingDelta, 0),
      mrpDelta: rows.reduce((sum, row) => sum + row.mrpDelta, 0),
    };
  }, [upload.updates]);

  const downloadCsv = () => {
    const csv = pricingRowsToCsv(filteredProducts.map(productToPricingRow));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vppa-pricing-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filteredProducts.length} product${filteredProducts.length === 1 ? "" : "s"}`);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = parsePricingCsv(await file.text());
      const validated =
        parsed.errors.length > 0 ? { updates: [], errors: parsed.errors } : validateRows(parsed.rows, products);
      setUpload({
        fileName: file.name,
        totalRows: parsed.rows.length,
        updates: validated.updates,
        errors: validated.errors,
      });
      setUploadedCount(0);
      if (validated.errors.length > 0) {
        toast.error(`${validated.errors.length} CSV issue${validated.errors.length === 1 ? "" : "s"} found`);
      } else {
        toast.success(`${validated.updates.length} row${validated.updates.length === 1 ? "" : "s"} ready to upload`);
      }
    } catch (error) {
      setUpload({ ...emptyUpload, fileName: file.name, errors: ["Could not read this CSV file."] });
      toast.error(error instanceof Error ? error.message : "Could not read this CSV file");
    }
  };

  const applyUpload = async () => {
    const updatesToApply = pricingReview.changedRows;
    if (upload.errors.length > 0 || updatesToApply.length === 0) return;
    setUploading(true);
    setUploadedCount(0);

    try {
      for (let index = 0; index < updatesToApply.length; index += UPDATE_BATCH_SIZE) {
        const batch = updatesToApply.slice(index, index + UPDATE_BATCH_SIZE);
        await Promise.all(
          batch.map(({ update }) =>
            updateProduct(update.product.$id, { price: update.sellingPrice, originalPrice: update.mrp }),
          ),
        );
        setUploadedCount(Math.min(index + batch.length, updatesToApply.length));
      }

      toast.success(`Updated ${updatesToApply.length} product prices`);
      setUpload(emptyUpload);
      await fetchProducts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Some prices could not be updated");
    } finally {
      setUploading(false);
    }
  };

  const clearUpload = () => {
    setUpload(emptyUpload);
    setUploadedCount(0);
  };

  return (
    <div className="@container/main flex flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BadgeIndianRupee className="size-6" />
            <h1 className="font-semibold text-2xl tracking-tight">Pricing CSV</h1>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            Download the full catalog, edit Selling Price and MRP in a spreadsheet, then upload it back.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void fetchProducts()} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button onClick={downloadCsv} disabled={loading || filteredProducts.length === 0}>
            <Download />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total catalog</CardDescription>
            <CardTitle className="text-2xl">{loading ? "…" : products.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            All products available for pricing updates
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current selection</CardDescription>
            <CardTitle className="text-2xl">{loading ? "…" : filteredProducts.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            The rows included in the next CSV download
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upload status</CardDescription>
            <CardTitle className="text-2xl">
              {uploading
                ? `${uploadedCount}/${pricingReview.changedCount}`
                : upload.fileName
                  ? `${pricingReview.changedCount}/${upload.updates.length}`
                  : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            {uploading ? "Updating products…" : upload.fileName || "No CSV selected"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5" />
            CSV workflow
          </CardTitle>
          <CardDescription>
            Keep Product ID or Item Code unchanged. Only Selling Price and MRP are written back to products; the other
            columns help you identify Men/Women and collections such as Velocity and Presence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="font-medium">1. Download</p>
              <p className="mt-1 text-muted-foreground">Export the filtered catalog as CSV.</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">2. Edit</p>
              <p className="mt-1 text-muted-foreground">Change Selling Price and MRP in Excel or Google Sheets.</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">3. Upload</p>
              <p className="mt-1 text-muted-foreground">Rows are validated before any product is updated.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-64 gap-2">
              <Label htmlFor="pricing-csv">Upload pricing CSV</Label>
              <Input
                ref={fileInputRef}
                id="pricing-csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => void handleFile(event)}
                disabled={loading || uploading}
              />
            </div>
            <Button
              onClick={() => void applyUpload()}
              disabled={uploading || upload.errors.length > 0 || pricingReview.changedCount === 0}
            >
              <Upload />
              {uploading
                ? `Updating ${uploadedCount}/${pricingReview.changedCount}…`
                : pricingReview.changedCount > 0
                  ? `Apply ${pricingReview.changedCount} changes`
                  : "No changes to apply"}
            </Button>
            {upload.fileName && (
              <Button variant="ghost" onClick={clearUpload} disabled={uploading}>
                Clear
              </Button>
            )}
          </div>

          {upload.fileName && upload.errors.length === 0 && !uploading && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>
                {upload.fileName}: {pricingReview.changedCount} price changes found across {upload.totalRows} rows.
                Review the comparison below before applying.
              </span>
            </div>
          )}

          {upload.errors.length > 0 && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="mb-2 flex items-center gap-2 font-medium text-destructive">
                <XCircle className="size-4" />
                Fix these CSV issues before uploading:
              </div>
              <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-destructive/90">
                {upload.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {upload.fileName && upload.errors.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Review price changes</CardTitle>
            <CardDescription>
              No product is updated until you click Apply. Old values are compared with the CSV values.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">Rows reviewed</p>
                <p className="mt-1 font-semibold text-lg">{pricingReview.rows.length}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">Products changing</p>
                <p className="mt-1 font-semibold text-lg">{pricingReview.changedCount}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">Unchanged</p>
                <p className="mt-1 font-semibold text-lg">{pricingReview.unchangedCount}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">Selling Price impact</p>
                <p
                  className={
                    pricingReview.sellingDelta > 0
                      ? "mt-1 font-semibold text-emerald-600"
                      : pricingReview.sellingDelta < 0
                        ? "mt-1 font-semibold text-destructive"
                        : "mt-1 font-semibold"
                  }
                >
                  {formatDelta(pricingReview.sellingDelta)}
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {pricingReview.sellingPriceChanges} field{pricingReview.sellingPriceChanges === 1 ? "" : "s"} changed
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">MRP impact</p>
                <p
                  className={
                    pricingReview.mrpDelta > 0
                      ? "mt-1 font-semibold text-emerald-600"
                      : pricingReview.mrpDelta < 0
                        ? "mt-1 font-semibold text-destructive"
                        : "mt-1 font-semibold"
                  }
                >
                  {formatDelta(pricingReview.mrpDelta)}
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {pricingReview.mrpChanges} field{pricingReview.mrpChanges === 1 ? "" : "s"} changed
                </p>
              </div>
            </div>

            {pricingReview.changedCount === 0 ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                Every uploaded price matches the current catalog. Nothing will be written.
              </div>
            ) : (
              <div className="max-h-[32rem] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Gender / Collection</TableHead>
                      <TableHead>Selling Price</TableHead>
                      <TableHead>MRP</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingReview.rows.map((review) => {
                      const { product, sellingPrice, mrp } = review.update;
                      return (
                        <TableRow key={`${product.$id}-${review.update.row.rowNumber}`}>
                          <TableCell className="font-medium">{product.itemCode || "—"}</TableCell>
                          <TableCell>
                            <div className="max-w-56 truncate font-medium">{product.name}</div>
                            <div className="max-w-56 truncate text-muted-foreground text-xs">
                              {product.sku || product.$id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>{product.gender || "Unisex"}</div>
                            <div className="text-muted-foreground text-xs capitalize">
                              {displayCollection(product.collectionSlug) || "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <span
                                className={
                                  review.sellingDelta === 0
                                    ? "text-muted-foreground"
                                    : "text-muted-foreground line-through"
                                }
                              >
                                {formatCurrency(review.currentSellingPrice)}
                              </span>
                              <ArrowRight className="size-3 text-muted-foreground" />
                              <span className="font-medium">{formatCurrency(sellingPrice)}</span>
                            </div>
                            <div className="text-muted-foreground text-xs">{formatDelta(review.sellingDelta)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <span
                                className={
                                  review.mrpDelta === 0 ? "text-muted-foreground" : "text-muted-foreground line-through"
                                }
                              >
                                {formatCurrency(review.currentMrp)}
                              </span>
                              <ArrowRight className="size-3 text-muted-foreground" />
                              <span className="font-medium">{formatCurrency(mrp)}</span>
                            </div>
                            <div className="text-muted-foreground text-xs">{formatDelta(review.mrpDelta)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={review.hasChanges ? "default" : "outline"}>
                              {review.hasChanges ? "Changes" : "No change"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Catalog pricing</CardTitle>
          <CardDescription>Use the filters to find a segment before downloading its CSV.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, item code, or SKU…"
              aria-label="Search products"
            />
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger aria-label="Filter by gender">
                <SelectValue placeholder="All genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genders</SelectItem>
                {genderOptions.map((gender) => (
                  <SelectItem key={gender} value={gender}>
                    {gender}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={collectionFilter} onValueChange={setCollectionFilter}>
              <SelectTrigger aria-label="Filter by collection">
                <SelectValue placeholder="All collections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All collections</SelectItem>
                {collectionOptions.map((collection) => (
                  <SelectItem key={collection} value={collection}>
                    {collection.charAt(0).toUpperCase() + collection.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">MRP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading products…
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No products match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const row = productToPricingRow(product);
                    return (
                      <TableRow key={product.$id}>
                        <TableCell className="font-medium">{row.itemCode || "—"}</TableCell>
                        <TableCell>
                          <div className="max-w-64 truncate font-medium">{row.productName}</div>
                          <div className="max-w-64 truncate text-muted-foreground text-xs">
                            {row.sku || product.$id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.gender || "Unisex"}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{row.collection || "—"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.sellingPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.mrp)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
