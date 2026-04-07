"use client";

import { useCallback, useEffect, useState } from "react";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createHsnCode, deleteHsnCode, getHsnCodes, updateHsnCode } from "@/lib/appwrite/hsn-codes";
import type { HsnCode } from "@/lib/appwrite/types";

interface HsnCodeForm {
  code: string;
  description: string;
  cgstPercent: string;
  sgstPercent: string;
  igstPercent: string;
}

const emptyForm: HsnCodeForm = {
  code: "",
  description: "",
  cgstPercent: "",
  sgstPercent: "",
  igstPercent: "",
};

export default function HsnCodesPage() {
  const [hsnCodes, setHsnCodes] = useState<HsnCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<HsnCode | null>(null);
  const [deletingCode, setDeletingCode] = useState<HsnCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<HsnCodeForm>(emptyForm);

  const fetchHsnCodes = useCallback(async () => {
    try {
      const res = await getHsnCodes();
      setHsnCodes(res.documents as HsnCode[]);
    } catch (error) {
      console.error("Failed to fetch HSN codes:", error);
      toast.error("Failed to load HSN codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHsnCodes();
  }, [fetchHsnCodes]);

  const handleNew = () => {
    setEditingCode(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleEdit = (hsn: HsnCode) => {
    setEditingCode(hsn);
    setForm({
      code: hsn.code,
      description: hsn.description,
      cgstPercent: String(hsn.cgstPercent),
      sgstPercent: String(hsn.sgstPercent),
      igstPercent: String(hsn.igstPercent || 0),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.description || !form.cgstPercent || !form.sgstPercent) {
      toast.error("Code, description, CGST%, and SGST% are required");
      return;
    }

    const cgst = Number.parseFloat(form.cgstPercent);
    const sgst = Number.parseFloat(form.sgstPercent);
    const igst = Number.parseFloat(form.igstPercent) || 0;

    if (Number.isNaN(cgst) || cgst < 0 || cgst > 100) {
      toast.error("CGST% must be between 0 and 100");
      return;
    }
    if (Number.isNaN(sgst) || sgst < 0 || sgst > 100) {
      toast.error("SGST% must be between 0 and 100");
      return;
    }

    setSaving(true);
    try {
      const data = {
        code: form.code.trim(),
        description: form.description.trim(),
        cgstPercent: cgst,
        sgstPercent: sgst,
        igstPercent: igst,
      };

      if (editingCode) {
        await updateHsnCode(editingCode.$id, data);
        toast.success("HSN code updated");
      } else {
        await createHsnCode(data);
        toast.success("HSN code created");
      }
      setDialogOpen(false);
      fetchHsnCodes();
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save HSN code");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCode) return;
    try {
      await deleteHsnCode(deletingCode.$id);
      toast.success("HSN code deleted");
      setDeleteDialogOpen(false);
      setDeletingCode(null);
      fetchHsnCodes();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete HSN code");
    }
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">HSN Codes</h1>
          <p className="text-muted-foreground text-sm">Manage HSN codes with CGST &amp; SGST rates for GST invoicing</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          Add HSN Code
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All HSN Codes ({hsnCodes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : hsnCodes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No HSN codes yet. Click &ldquo;Add HSN Code&rdquo; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">CGST %</TableHead>
                  <TableHead className="text-center">SGST %</TableHead>
                  <TableHead className="text-center">Total GST %</TableHead>
                  <TableHead className="text-center">IGST %</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hsnCodes.map((hsn) => (
                  <TableRow key={hsn.$id}>
                    <TableCell className="font-mono font-medium">{hsn.code}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{hsn.description}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{hsn.cgstPercent}%</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{hsn.sgstPercent}%</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge>{hsn.cgstPercent + hsn.sgstPercent}%</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{hsn.igstPercent || 0}%</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(hsn)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeletingCode(hsn);
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCode ? "Edit HSN Code" : "New HSN Code"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">HSN Code *</Label>
              <Input
                id="code"
                value={form.code}
                placeholder="e.g. 6109"
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={form.description}
                placeholder="e.g. T-shirts, singlets and other vests, knitted or crocheted"
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cgstPercent">CGST % *</Label>
                <Input
                  id="cgstPercent"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={form.cgstPercent}
                  placeholder="e.g. 2.5"
                  onChange={(e) => setForm({ ...form, cgstPercent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sgstPercent">SGST % *</Label>
                <Input
                  id="sgstPercent"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={form.sgstPercent}
                  placeholder="e.g. 2.5"
                  onChange={(e) => setForm({ ...form, sgstPercent: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="igstPercent">IGST %</Label>
                <Input
                  id="igstPercent"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={form.igstPercent}
                  placeholder="e.g. 5"
                  onChange={(e) => setForm({ ...form, igstPercent: e.target.value })}
                />
              </div>
            </div>
            {form.cgstPercent && form.sgstPercent && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <strong>Total GST:</strong>{" "}
                {(Number.parseFloat(form.cgstPercent) || 0) + (Number.parseFloat(form.sgstPercent) || 0)}%
                <span className="ml-4 text-muted-foreground">
                  (CGST {form.cgstPercent}% + SGST {form.sgstPercent}%)
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingCode ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete HSN Code</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete HSN code <strong>{deletingCode?.code}</strong>? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
