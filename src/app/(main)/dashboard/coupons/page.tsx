"use client";

import { useCallback, useEffect, useState } from "react";

import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CharCount } from "@/components/ui/char-count";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createCoupon, deleteCoupon, getCoupons, updateCoupon } from "@/lib/appwrite/coupons";
import { getProducts } from "@/lib/appwrite/products";
import type { Coupon, Product } from "@/lib/appwrite/types";

interface CouponForm {
  code: string;
  description: string;
  discountType: "percentage" | "flat";
  discountValue: string;
  minOrderAmount: string;
  maxDiscount: string;
  active: boolean;
  expiresAt: string;
  usageLimit: string;
  applicableProductIds: string[];
}

const emptyForm: CouponForm = {
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "",
  maxDiscount: "",
  active: true,
  expiresAt: "",
  usageLimit: "",
  applicableProductIds: [],
};

function parseProductIds(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return [];
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [couponRes, productRes] = await Promise.all([getCoupons(), getProducts()]);
      setCoupons(couponRes.documents as Coupon[]);
      setProducts(productRes.documents as Product[]);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNew = () => {
    setEditingCoupon(null);
    setForm(emptyForm);
    setProductSearch("");
    setDialogOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : "",
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : "",
      active: coupon.active,
      expiresAt: coupon.expiresAt || "",
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
      applicableProductIds: parseProductIds(coupon.applicableProductIds),
    });
    setProductSearch("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.discountValue) {
      toast.error("Code and discount value are required");
      return;
    }
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        code: form.code.toUpperCase().trim(),
        description: form.description,
        discountType: form.discountType,
        discountValue: Number.parseFloat(form.discountValue),
        minOrderAmount: form.minOrderAmount ? Number.parseFloat(form.minOrderAmount) : 0,
        maxDiscount: form.maxDiscount ? Number.parseFloat(form.maxDiscount) : 0,
        active: form.active,
        expiresAt: form.expiresAt || "",
        usageLimit: form.usageLimit ? Number.parseInt(form.usageLimit, 10) : 0,
        usedCount: editingCoupon?.usedCount ?? 0,
        applicableProductIds: form.applicableProductIds.length > 0 ? JSON.stringify(form.applicableProductIds) : "",
      };

      if (editingCoupon) {
        await updateCoupon(editingCoupon.$id, data);
        toast.success("Coupon updated");
      } else {
        await createCoupon(data);
        toast.success("Coupon created");
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCoupon) return;
    try {
      await deleteCoupon(deletingCoupon.$id);
      toast.success("Coupon deleted");
      setDeleteDialogOpen(false);
      setDeletingCoupon(null);
      fetchData();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete coupon");
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await updateCoupon(coupon.$id, { active: !coupon.active });
      toast.success(coupon.active ? "Coupon deactivated" : "Coupon activated");
      fetchData();
    } catch (error) {
      console.error("Toggle failed:", error);
      toast.error("Failed to toggle coupon status");
    }
  };

  const toggleProduct = (productId: string) => {
    setForm((prev) => {
      const ids = prev.applicableProductIds.includes(productId)
        ? prev.applicableProductIds.filter((id) => id !== productId)
        : [...prev.applicableProductIds, productId];
      return { ...prev, applicableProductIds: ids };
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const isExpired = (expiresAt: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const filteredProducts = productSearch
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  const activeCoupons = coupons.filter((c) => c.active && !isExpired(c.expiresAt));
  const inactiveCoupons = coupons.filter((c) => !c.active || isExpired(c.expiresAt));

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Coupons</h1>
          <p className="text-muted-foreground text-sm">Manage discount coupons and assign them to products</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Coupon
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-sm">Total Coupons</div>
            <div className="font-bold text-2xl">{coupons.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-sm">Active</div>
            <div className="font-bold text-2xl text-green-600">{activeCoupons.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-sm">Inactive / Expired</div>
            <div className="font-bold text-2xl text-red-600">{inactiveCoupons.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-sm">Total Used</div>
            <div className="font-bold text-2xl">{coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Coupons ({coupons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading coupons...</div>
          ) : coupons.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No coupons yet. Click &quot;Add Coupon&quot; to create your first coupon.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const productIds = parseProductIds(coupon.applicableProductIds);
                  const expired = isExpired(coupon.expiresAt);
                  return (
                    <TableRow key={coupon.$id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{coupon.code}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(coupon.code);
                              toast.success("Copied!");
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {coupon.description && (
                          <div className="text-muted-foreground text-xs">{coupon.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {coupon.discountType === "percentage"
                            ? `${coupon.discountValue}%`
                            : formatCurrency(coupon.discountValue)}
                        </span>
                        {coupon.maxDiscount > 0 && coupon.discountType === "percentage" && (
                          <div className="text-muted-foreground text-xs">Max: {formatCurrency(coupon.maxDiscount)}</div>
                        )}
                      </TableCell>
                      <TableCell>{coupon.minOrderAmount > 0 ? formatCurrency(coupon.minOrderAmount) : "—"}</TableCell>
                      <TableCell>
                        {coupon.usedCount || 0}
                        {coupon.usageLimit > 0 && <span className="text-muted-foreground"> / {coupon.usageLimit}</span>}
                      </TableCell>
                      <TableCell>
                        {coupon.expiresAt ? (
                          <span className={expired ? "text-red-500" : ""}>
                            {new Date(coupon.expiresAt).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                            {expired && (
                              <Badge variant="outline" className="ml-1 text-red-500">
                                Expired
                              </Badge>
                            )}
                          </span>
                        ) : (
                          "No expiry"
                        )}
                      </TableCell>
                      <TableCell>
                        {productIds.length === 0 ? (
                          <span className="text-muted-foreground text-xs">All products</span>
                        ) : (
                          <span className="text-xs">
                            {productIds.length} product
                            {productIds.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={coupon.active} onCheckedChange={() => handleToggleActive(coupon)} />
                          <Badge
                            variant="outline"
                            className={
                              coupon.active && !expired
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }
                          >
                            {coupon.active && !expired ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              setDeletingCoupon(coupon);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code *</Label>
              <Input
                id="code"
                value={form.code}
                placeholder="e.g. SUMMER20"
                onChange={(e) =>
                  setForm({
                    ...form,
                    code: e.target.value.toUpperCase(),
                  })
                }
                className="font-mono uppercase"
              />
              <CharCount current={form.code.length} max={50} />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="couponDesc">Description</Label>
              <Textarea
                id="couponDesc"
                value={form.description}
                placeholder="e.g. Summer sale - 20% off on all products"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
              <CharCount current={form.description.length} max={500} />
            </div>

            {/* Discount Type + Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type *</Label>
                <SearchableSelect
                  value={form.discountType}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      discountType: value as "percentage" | "flat",
                    })
                  }
                  options={[
                    { value: "percentage", label: "Percentage (%)" },
                    { value: "flat", label: "Flat Amount (INR)" },
                  ]}
                  placeholder="Select type"
                  searchPlaceholder="Search..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountValue">
                  Discount Value * {form.discountType === "percentage" ? "(%)" : "(INR)"}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  value={form.discountValue}
                  placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 500"}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                />
              </div>
            </div>

            {/* Min Order + Max Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minOrder">Min Order Amount (INR)</Label>
                <Input
                  id="minOrder"
                  type="number"
                  value={form.minOrderAmount}
                  placeholder="e.g. 1000"
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                />
              </div>
              {form.discountType === "percentage" && (
                <div className="space-y-2">
                  <Label htmlFor="maxDiscount">Max Discount (INR)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    value={form.maxDiscount}
                    placeholder="e.g. 500"
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  />
                </div>
              )}
            </div>

            {/* Expiry + Usage Limit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiry Date</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={form.expiresAt ? form.expiresAt.split("T")[0] : ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expiresAt: e.target.value ? `${e.target.value}T23:59:59.000Z` : "",
                    })
                  }
                />
                <p className="text-muted-foreground text-xs">Leave blank for no expiry</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageLimit">Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={form.usageLimit}
                  placeholder="e.g. 100"
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                />
                <p className="text-muted-foreground text-xs">0 = unlimited</p>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
              <Label>Active</Label>
            </div>

            {/* Applicable Products */}
            <div className="space-y-2">
              <Label>Applicable Products</Label>
              <p className="text-muted-foreground text-xs">
                Select which products this coupon can be applied to. If none selected, coupon applies to all products.
              </p>
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto rounded-md border p-2">
                {form.applicableProductIds.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {form.applicableProductIds.map((id) => {
                      const p = products.find((prod) => prod.$id === id);
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => toggleProduct(id)}
                        >
                          {p?.name || id.slice(0, 8)}
                          <span className="ml-1">&times;</span>
                        </Badge>
                      );
                    })}
                  </div>
                )}
                {filteredProducts.length === 0 ? (
                  <div className="py-2 text-center text-muted-foreground text-xs">No products found</div>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.$id}
                      type="button"
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                        form.applicableProductIds.includes(product.$id) ? "bg-primary/10 font-medium" : ""
                      }`}
                      onClick={() => toggleProduct(product.$id)}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          form.applicableProductIds.includes(product.$id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {form.applicableProductIds.includes(product.$id) && <span className="text-xs">&#10003;</span>}
                      </span>
                      <span className="truncate">{product.name}</span>
                      <span className="ml-auto text-muted-foreground text-xs">{formatCurrency(product.price)}</span>
                    </button>
                  ))
                )}
              </div>
              {form.applicableProductIds.length > 0 && (
                <p className="text-xs">
                  {form.applicableProductIds.length} product
                  {form.applicableProductIds.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingCoupon ? "Update Coupon" : "Create Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Coupon</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete coupon <strong className="font-mono">{deletingCoupon?.code}</strong>? This
            action cannot be undone.
          </p>
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
