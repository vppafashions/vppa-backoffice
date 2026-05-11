"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ExternalLink, ImageIcon, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProducts } from "@/lib/appwrite/products";
import { deleteReview, getReviews } from "@/lib/appwrite/reviews";
import type { Product, Review } from "@/lib/appwrite/types";

function StarStrip({ value }: { value: number }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`size-3.5 ${s <= value ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [reviewsRes, productsRes] = await Promise.all([getReviews(500), getProducts(500)]);
      setReviews(reviewsRes.documents as Review[]);
      const map: Record<string, Product> = {};
      for (const p of productsRes.documents as Product[]) {
        map[p.$id] = p;
      }
      setProductMap(map);
    } catch (error) {
      console.error("Failed to load reviews:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((r) => {
      const product = productMap[r.productId];
      const productName = product?.name?.toLowerCase() || "";
      return (
        productName.includes(q) ||
        r.authorName?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.authorEmail?.toLowerCase().includes(q)
      );
    });
  }, [reviews, productMap, search]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total : 0;
    const withPhotos = reviews.filter((r) => r.photoUrl).length;
    const lowRated = reviews.filter((r) => (r.rating || 0) <= 2).length;
    return { total, avg, withPhotos, lowRated };
  }, [reviews]);

  function askDelete(r: Review) {
    setDeletingReview(r);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingReview) return;
    setDeletePending(true);
    try {
      await deleteReview(deletingReview.$id);
      setReviews((prev) => prev.filter((r) => r.$id !== deletingReview.$id));
      toast.success("Review deleted");
      setDeleteOpen(false);
      setDeletingReview(null);
    } catch (error) {
      console.error("Failed to delete review:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Reviews</h1>
        <p className="text-muted-foreground text-sm">
          View and moderate customer reviews. Reviews are public by default.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-2xl">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-2xl">{stats.avg.toFixed(1)}</span>
              <StarStrip value={Math.round(stats.avg)} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">With Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-2xl">{stats.withPhotos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Low-rated (≤2★)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-2xl">{stats.lowRated}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search product, author, title, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="w-[120px]">Rating</TableHead>
                <TableHead>Title / Comment</TableHead>
                <TableHead className="w-[180px]">Author</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[80px]">Photo</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground text-sm">
                    Loading reviews…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground text-sm">
                    {reviews.length === 0 ? "No reviews yet." : "No reviews match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => {
                  const product = productMap[r.productId];
                  return (
                    <TableRow key={r.$id}>
                      <TableCell className="align-top">
                        {product ? (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-sm">{product.name}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {r.productId}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-1">
                          <StarStrip value={r.rating} />
                          <span className="text-muted-foreground text-xs">{r.rating}/5</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="font-medium text-sm">{r.title}</div>
                        <div className="mt-1 max-w-md text-muted-foreground text-xs whitespace-pre-line">
                          {r.comment}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-sm">{r.authorName}</div>
                        <div className="text-muted-foreground text-xs">{r.authorEmail}</div>
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground text-xs">
                        {formatDate(r.$createdAt)}
                      </TableCell>
                      <TableCell className="align-top">
                        {r.photoUrl ? (
                          <a
                            href={r.photoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block size-14 overflow-hidden rounded border hover:opacity-80"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={r.photoUrl} alt="Review" className="size-full object-cover" />
                          </a>
                        ) : (
                          <ImageIcon className="size-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Button variant="ghost" size="icon" aria-label="Delete review" onClick={() => askDelete(r)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this review?</DialogTitle>
          </DialogHeader>
          {deletingReview ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <StarStrip value={deletingReview.rating} />
                <span className="font-medium">{deletingReview.title}</span>
              </div>
              <div className="text-muted-foreground">{deletingReview.comment}</div>
              <div className="text-muted-foreground text-xs">
                — {deletingReview.authorName} on {formatDate(deletingReview.$createdAt)}
              </div>
              {productMap[deletingReview.productId] ? (
                <div className="flex items-center gap-1 pt-2 text-xs">
                  <ExternalLink className="size-3" /> Product:{" "}
                  <span className="font-medium">{productMap[deletingReview.productId].name}</span>
                </div>
              ) : null}
              <p className="pt-3 text-destructive">This permanently removes the review. Cannot be undone.</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deletePending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletePending}>
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
