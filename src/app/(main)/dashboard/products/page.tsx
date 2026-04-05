"use client";

import { useCallback, useEffect, useState } from "react";

import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage } from "@/lib/appwrite/cloudinary";
import {
  COLLECTION_SLUG_LABELS,
  COLLECTION_SLUG_VALUES,
  type CollectionSlug,
  getCollectionSlugLabel,
  isCollectionSlug,
} from "@/lib/appwrite/collection-slugs";
import { createProduct, deleteProduct, getProducts, updateProduct } from "@/lib/appwrite/products";
import type { Product } from "@/lib/appwrite/types";

const PRODUCT_TYPES = [
  "Hoodie",
  "Sweatshirt",
  "T-Shirt",
  "Polo",
  "Jacket",
  "Shirt",
  "Pants",
  "Shorts",
  "Cap",
  "Accessory",
] as const;

interface ProductForm {
  name: string;
  itemCode: string;
  hsnCode: string;
  description: string;
  price: string;
  originalPrice: string;
  category: string;
  collectionSlug: CollectionSlug | "";
  sizes: string;
  colors: string;
  stockQuantity: string;
  displayOnMainPage: boolean;
  displayOnCollectionPage: boolean;
  featured: boolean;
  slug: string;
  productType: string;
}

const emptyForm: ProductForm = {
  name: "",
  itemCode: "",
  hsnCode: "",
  description: "",
  price: "",
  originalPrice: "",
  category: "",
  collectionSlug: "",
  sizes: "",
  colors: "",
  stockQuantity: "0",
  displayOnMainPage: false,
  displayOnCollectionPage: true,
  featured: false,
  slug: "",
  productType: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await getProducts();
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

  const handleNew = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setImages([]);
    setDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      itemCode: product.itemCode || "",
      hsnCode: product.hsnCode || "",
      description: product.description || "",
      price: String(product.price),
      originalPrice: String(product.originalPrice || ""),
      category: product.category || "",
      collectionSlug: isCollectionSlug(product.collectionSlug) ? product.collectionSlug : "",
      sizes: product.sizes || "",
      colors: product.colors || "",
      stockQuantity: String(product.stockQuantity ?? 0),
      displayOnMainPage: product.displayOnMainPage ?? false,
      displayOnCollectionPage: product.displayOnCollectionPage ?? true,
      featured: product.featured || false,
      slug: product.slug || "",
      productType: product.productType || "",
    });
    try {
      setImages(product.images ? JSON.parse(product.images) : []);
    } catch {
      setImages([]);
    }
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls]);
      toast.success(`Uploaded ${urls.length} image(s)`);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.name || !form.itemCode || !form.hsnCode || !form.price || !form.collectionSlug) {
      toast.error("Name, item code, HSN code, price, and collection are required");
      return;
    }

    if (!form.productType) {
      toast.error("Product type is required for SKU generation");
      return;
    }

    const stockQuantity = Number.parseInt(form.stockQuantity, 10);
    if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
      toast.error("Stock quantity must be a valid non-negative number");
      return;
    }

    if (!/^\d{4,8}$/.test(form.hsnCode.trim())) {
      toast.error("HSN code must be 4 to 8 digits");
      return;
    }
    setSaving(true);
    try {
      // Auto-generate SKU: VPPA-{Type}-{Color}-{Size}-{0001}
      const firstColor = form.colors.split(",")[0]?.trim() || "NA";
      const firstSize = form.sizes.split(",")[0]?.trim() || "NA";
      const typeTag = form.productType.replace(/\s+/g, "-");

      // Find next running number for this type prefix
      const skuPrefix = `VPPA-${typeTag}-${firstColor}-${firstSize}-`.toUpperCase();
      let maxNum = 0;
      for (const p of products) {
        const pSku = (p.sku || "").toUpperCase();
        if (pSku.startsWith(skuPrefix)) {
          const numPart = pSku.slice(skuPrefix.length);
          const parsed = Number.parseInt(numPart, 10);
          if (!Number.isNaN(parsed) && parsed > maxNum) maxNum = parsed;
        }
      }
      const skuToUse = editingProduct?.sku ? editingProduct.sku : `${skuPrefix}${String(maxNum + 1).padStart(4, "0")}`;

      const data = {
        name: form.name,
        itemCode: form.itemCode.trim(),
        hsnCode: form.hsnCode.trim(),
        description: form.description,
        price: Number.parseFloat(form.price),
        originalPrice: form.originalPrice ? Number.parseFloat(form.originalPrice) : 0,
        category: form.category,
        collectionSlug: form.collectionSlug,
        images: JSON.stringify(images),
        sizes: form.sizes,
        colors: form.colors,
        stockQuantity,
        displayOnMainPage: form.displayOnMainPage,
        displayOnCollectionPage: form.displayOnCollectionPage,
        featured: form.featured,
        inStock: stockQuantity > 0,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-"),
        productType: form.productType,
        sku: skuToUse,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.$id, data);
        toast.success("Product updated");
      } else {
        await createProduct(data);
        toast.success("Product created");
      }
      setDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduct(deletingProduct.$id);
      toast.success("Product deleted");
      setDeleteDialogOpen(false);
      setDeletingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete product");
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Products</h1>
          <p className="text-muted-foreground text-sm">Manage your product catalog</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Products ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No products yet. Click "Add Product" to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>Home</TableHead>
                  <TableHead>Collection Page</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.$id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono text-xs uppercase">{product.sku || "—"}</TableCell>
                    <TableCell>{product.productType || "—"}</TableCell>
                    <TableCell className="font-mono text-xs uppercase">{product.itemCode}</TableCell>
                    <TableCell className="font-mono text-xs">{product.hsnCode}</TableCell>
                    <TableCell>{formatCurrency(product.price)}</TableCell>
                    <TableCell>
                      {product.collectionSlug ? (
                        <Badge variant="outline">{getCollectionSlugLabel(product.collectionSlug)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.displayOnMainPage ? "default" : "secondary"}>
                        {product.displayOnMainPage ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.displayOnCollectionPage ? "default" : "secondary"}>
                        {product.displayOnCollectionPage ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.stockQuantity ?? 0}</TableCell>
                    <TableCell>
                      {(product.stockQuantity ?? 0) > 0 ? (
                        <Badge variant="default">In Stock</Badge>
                      ) : (
                        <Badge variant="secondary">Out of Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(product)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeletingProduct(product);
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productType">Product Type *</Label>
                <Select
                  value={form.productType || undefined}
                  onValueChange={(value) => setForm({ ...form, productType: value })}
                >
                  <SelectTrigger id="productType" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemCode">Item Code *</Label>
                <Input
                  id="itemCode"
                  value={form.itemCode}
                  placeholder="e.g. VPPA-001"
                  onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  placeholder="auto-generated"
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input
                  value={editingProduct?.sku || "Auto-generated on save"}
                  disabled
                  className="font-mono text-xs uppercase"
                />
                <p className="text-muted-foreground text-xs">Format: VPPA-Type-Color-Size-0001</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (INR) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Original Price (INR)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  value={form.originalPrice}
                  onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hsnCode">HSN Code *</Label>
                <Input
                  id="hsnCode"
                  inputMode="numeric"
                  value={form.hsnCode}
                  placeholder="e.g. 6109"
                  onChange={(e) => setForm({ ...form, hsnCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  min="0"
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collectionSlug">Collection Slug</Label>
                <Select
                  value={form.collectionSlug || undefined}
                  onValueChange={(value) => setForm({ ...form, collectionSlug: value as CollectionSlug })}
                >
                  <SelectTrigger id="collectionSlug" className="w-full">
                    <SelectValue placeholder="Select a collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLECTION_SLUG_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {COLLECTION_SLUG_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sizes">Sizes (comma-separated)</Label>
                <Input
                  id="sizes"
                  value={form.sizes}
                  placeholder="S, M, L, XL"
                  onChange={(e) => setForm({ ...form, sizes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="colors">Colors (comma-separated)</Label>
                <Input
                  id="colors"
                  value={form.colors}
                  placeholder="Black, Navy, White"
                  onChange={(e) => setForm({ ...form, colors: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="displayOnMainPage"
                  checked={form.displayOnMainPage}
                  onCheckedChange={(checked) => setForm({ ...form, displayOnMainPage: checked })}
                />
                <Label htmlFor="displayOnMainPage">Display on Main Page</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="displayOnCollectionPage"
                  checked={form.displayOnCollectionPage}
                  onCheckedChange={(checked) => setForm({ ...form, displayOnCollectionPage: checked })}
                />
                <Label htmlFor="displayOnCollectionPage">Display on Collection Page</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="featured"
                  checked={form.featured}
                  onCheckedChange={(checked) => setForm({ ...form, featured: checked })}
                />
                <Label htmlFor="featured">Featured</Label>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>Stock status updates automatically from quantity</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Images</Label>
              <div className="flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <div key={url} className="group relative size-20 overflow-hidden rounded-md border">
                    <img src={url} alt={`Product ${i + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="size-4 text-white" />
                    </button>
                  </div>
                ))}
                <label className="flex size-20 cursor-pointer items-center justify-center rounded-md border border-dashed hover:bg-muted">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <span className="text-muted-foreground text-xs">...</span>
                  ) : (
                    <ImageIcon className="size-5 text-muted-foreground" />
                  )}
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingProduct ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete &quot;{deletingProduct?.name}&quot;? This action cannot be undone.</p>
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
