"use client";

import { useCallback, useEffect, useState } from "react";

import { Heart, ShoppingCart, User } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type CustomerWithActivity, getCustomersWithActivity } from "@/lib/appwrite/customers";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithActivity | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await getCustomersWithActivity();
      setCustomers(res);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const totalCartValue = customers.reduce((sum, c) => sum + c.cartTotal, 0);
  const totalWishlistItems = customers.reduce((sum, c) => sum + c.wishlistItems.length, 0);
  const customersWithCart = customers.filter((c) => c.cartItems.length > 0).length;
  const customersWithWishlist = customers.filter((c) => c.wishlistItems.length > 0).length;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Customers</h1>
        <p className="text-muted-foreground text-sm">View customer cart and wishlist activity</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Total Customers</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Active Carts</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{customersWithCart}</div>
            <p className="text-muted-foreground text-xs">{formatCurrency(totalCartValue)} total value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Wishlists</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{customersWithWishlist}</div>
            <p className="text-muted-foreground text-xs">{totalWishlistItems} total items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">Avg Cart Value</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {customersWithCart > 0 ? formatCurrency(totalCartValue / customersWithCart) : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading customers...</div>
          ) : customers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No customers yet. Customer data will appear here when users interact with the store.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Cart Items</TableHead>
                  <TableHead>Cart Value</TableHead>
                  <TableHead>Wishlist</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.$id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {customer.authName ||
                            (customer.firstName || customer.lastName
                              ? `${customer.firstName} ${customer.lastName}`.trim()
                              : "Anonymous User")}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {customer.authEmail || customer.email || `${customer.userId.slice(0, 12)}...`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{customer.authPhone || customer.phone || "—"}</TableCell>
                    <TableCell>
                      {customer.cartItems.length > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          <ShoppingCart className="mr-1 h-3 w-3" />
                          {customer.cartItems.length}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {customer.cartTotal > 0 ? formatCurrency(customer.cartTotal) : "—"}
                    </TableCell>
                    <TableCell>
                      {customer.wishlistItems.length > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                        >
                          <Heart className="mr-1 h-3 w-3" />
                          {customer.wishlistItems.length}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setDetailsOpen(true);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-5">
              {/* Profile Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">
                    {selectedCustomer.authName ||
                      (selectedCustomer.firstName || selectedCustomer.lastName
                        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim()
                        : "Anonymous")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedCustomer.authEmail || selectedCustomer.email || "—"}</p>
                </div>
                {(selectedCustomer.authPhone || selectedCustomer.phone) && (
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedCustomer.authPhone || selectedCustomer.phone}</p>
                  </div>
                )}
                {selectedCustomer.alternatePhone && (
                  <div>
                    <Label className="text-muted-foreground">Alt Phone</Label>
                    <p className="font-medium">{selectedCustomer.alternatePhone}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <Label className="text-muted-foreground">User ID</Label>
                  <p className="font-mono text-xs">{selectedCustomer.userId}</p>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedCustomer.shippingAddress && (
                <div className="text-sm">
                  <Label className="text-muted-foreground">Shipping Address</Label>
                  <p className="font-medium">
                    {[
                      selectedCustomer.shippingAddress,
                      selectedCustomer.landmark,
                      selectedCustomer.shippingCity,
                      selectedCustomer.shippingState,
                      selectedCustomer.shippingPincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}

              {selectedCustomer.gstin && (
                <div className="text-sm">
                  <Label className="text-muted-foreground">GSTIN</Label>
                  <p className="font-mono text-xs">{selectedCustomer.gstin}</p>
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <ShoppingCart className="h-4 w-4" />
                  Cart Items ({selectedCustomer.cartItems.length})
                </Label>
                {selectedCustomer.cartItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No items in cart</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.cartItems.map((item) => (
                      <div key={item.$id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="h-12 w-12 rounded object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-xs">
                            Size: {item.size} | Color: {item.color} | Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 text-sm font-semibold">
                      <span>Cart Total</span>
                      <span>{formatCurrency(selectedCustomer.cartTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Wishlist Items */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Heart className="h-4 w-4" />
                  Wishlist ({selectedCustomer.wishlistItems.length})
                </Label>
                {selectedCustomer.wishlistItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No items in wishlist</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.wishlistItems.map((item) => (
                      <div key={item.$id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                        {item.image && (
                          <img src={item.image} alt={item.name} className="h-12 w-12 rounded object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {item.collectionSlug} | {formatCurrency(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
