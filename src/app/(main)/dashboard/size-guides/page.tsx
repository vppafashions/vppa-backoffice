"use client";

import { useCallback, useEffect, useState } from "react";

import { ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { uploadImage } from "@/lib/appwrite/cloudinary";
import { createSizeGuide, deleteSizeGuide, getSizeGuides, updateSizeGuide } from "@/lib/appwrite/size-guides";
import type { SizeGuide } from "@/lib/appwrite/types";

const CLOTHING_TYPES = [
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

const GENDER_OPTIONS = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
  { value: "unisex", label: "Unisex" },
] as const;

const UNIT_OPTIONS = [
  { value: "inches", label: "Inches" },
  { value: "cm", label: "Centimeters" },
  { value: "both", label: "Both (in & cm)" },
] as const;

// Default column presets based on gender + clothing type
const COLUMN_PRESETS: Record<string, string[]> = {
  "men-Hoodie": [
    "Size",
    "Chest (in)",
    "Chest (cm)",
    "Shoulder (in)",
    "Shoulder (cm)",
    "Sleeve Length (in)",
    "Sleeve Length (cm)",
    "Body Length (in)",
    "Body Length (cm)",
  ],
  "men-Sweatshirt": [
    "Size",
    "Chest (in)",
    "Chest (cm)",
    "Shoulder (in)",
    "Shoulder (cm)",
    "Sleeve Length (in)",
    "Sleeve Length (cm)",
    "Body Length (in)",
    "Body Length (cm)",
  ],
  "men-T-Shirt": [
    "Size",
    "Chest (in)",
    "Chest (cm)",
    "Shoulder (in)",
    "Shoulder (cm)",
    "Sleeve Length (in)",
    "Sleeve Length (cm)",
    "Body Length (in)",
    "Body Length (cm)",
  ],
  "men-Polo": [
    "Size",
    "Chest (in)",
    "Chest (cm)",
    "Shoulder (in)",
    "Shoulder (cm)",
    "Sleeve Length (in)",
    "Sleeve Length (cm)",
    "Body Length (in)",
    "Body Length (cm)",
  ],
  "men-Shirt": [
    "Size",
    "Chest (in)",
    "Chest (cm)",
    "Shoulder (in)",
    "Shoulder (cm)",
    "Sleeve Length (in)",
    "Sleeve Length (cm)",
    "Body Length (in)",
    "Body Length (cm)",
    "Neck (in)",
    "Neck (cm)",
  ],
  "men-Jacket": [
    "Size",
    "Chest (in)",
    "Chest (cm)",
    "Shoulder (in)",
    "Shoulder (cm)",
    "Sleeve Length (in)",
    "Sleeve Length (cm)",
    "Body Length (in)",
    "Body Length (cm)",
  ],
  "men-Pants": [
    "Size",
    "Waist (in)",
    "Waist (cm)",
    "Hip (in)",
    "Hip (cm)",
    "Inseam (in)",
    "Inseam (cm)",
    "Thigh (in)",
    "Thigh (cm)",
  ],
  "men-Shorts": [
    "Size",
    "Waist (in)",
    "Waist (cm)",
    "Hip (in)",
    "Hip (cm)",
    "Length (in)",
    "Length (cm)",
    "Thigh (in)",
    "Thigh (cm)",
  ],
  "women-Hoodie": [
    "Size",
    "Bust (in)",
    "Bust (cm)",
    "Waist (in)",
    "Waist (cm)",
    "Hip (in)",
    "Hip (cm)",
    "Shoulder (in)",
    "Shoulder (cm)",
    "Sleeve Length (in)",
    "Sleeve Length (cm)",
  ],
  "women-Sweatshirt": [
    "Size",
    "Bust (in)",
    "Bust (cm)",
    "Waist (in)",
    "Waist (cm)",
    "Hip (in)",
    "Hip (cm)",
    "Shoulder (in)",
    "Shoulder (cm)",
    "Sleeve Length (in)",
    "Sleeve Length (cm)",
  ],
  "women-T-Shirt": [
    "Size",
    "Bust (in)",
    "Bust (cm)",
    "Waist (in)",
    "Waist (cm)",
    "Hip (in)",
    "Hip (cm)",
    "Shoulder (in)",
    "Shoulder (cm)",
  ],
  "women-Polo": [
    "Size",
    "Bust (in)",
    "Bust (cm)",
    "Waist (in)",
    "Waist (cm)",
    "Hip (in)",
    "Hip (cm)",
    "Shoulder (in)",
    "Shoulder (cm)",
  ],
  "women-Shirt": [
    "Size",
    "Bust (in)",
    "Bust (cm)",
    "Waist (in)",
    "Waist (cm)",
    "Hip (in)",
    "Hip (cm)",
    "Body Length (in)",
    "Body Length (cm)",
  ],
  "women-Jacket": [
    "Size",
    "Bust (in)",
    "Bust (cm)",
    "Waist (in)",
    "Waist (cm)",
    "Hip (in)",
    "Hip (cm)",
    "Shoulder (in)",
    "Shoulder (cm)",
    "Sleeve Length (in)",
    "Sleeve Length (cm)",
  ],
  "women-Pants": [
    "Size",
    "Waist (in)",
    "Waist (cm)",
    "Hip (in)",
    "Hip (cm)",
    "Inseam (in)",
    "Inseam (cm)",
    "Thigh (in)",
    "Thigh (cm)",
  ],
  "women-Shorts": [
    "Size",
    "Waist (in)",
    "Waist (cm)",
    "Hip (in)",
    "Hip (cm)",
    "Length (in)",
    "Length (cm)",
    "Thigh (in)",
    "Thigh (cm)",
  ],
};

function getPresetKey(gender: string, clothingType: string): string {
  return `${gender}-${clothingType}`;
}

function parseJsonSafe<T>(raw: string | undefined | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface SizeGuideForm {
  name: string;
  gender: string;
  clothingType: string;
  unit: string;
  measureImage: string;
}

export default function SizeGuidesPage() {
  const [guides, setGuides] = useState<SizeGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<SizeGuide | null>(null);
  const [deletingGuide, setDeletingGuide] = useState<SizeGuide | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SizeGuideForm>({
    name: "",
    gender: "",
    clothingType: "",
    unit: "both",
    measureImage: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [columns, setColumns] = useState<string[]>(["Size"]);
  const [rows, setRows] = useState<string[][]>([[""]]);
  const [newColumnName, setNewColumnName] = useState("");

  const fetchGuides = useCallback(async () => {
    try {
      const res = await getSizeGuides();
      setGuides(res.documents as SizeGuide[]);
    } catch (error) {
      console.error("Failed to fetch size guides:", error);
      toast.error("Failed to load size guides");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  const handleNew = () => {
    setEditingGuide(null);
    setForm({ name: "", gender: "", clothingType: "", unit: "both", measureImage: "" });
    setColumns(["Size"]);
    setRows([[""]]);
    setNewColumnName("");
    setDialogOpen(true);
  };

  const handleEdit = (guide: SizeGuide) => {
    setEditingGuide(guide);
    setForm({
      name: guide.name,
      gender: guide.gender,
      clothingType: guide.clothingType,
      unit: guide.unit || "both",
      measureImage: guide.measureImage || "",
    });
    const cols = parseJsonSafe<string[]>(guide.columns, ["Size"]);
    const rws = parseJsonSafe<string[][]>(guide.rows, [[""]]);
    setColumns(cols);
    setRows(rws);
    setNewColumnName("");
    setDialogOpen(true);
  };

  const handlePresetLoad = (gender: string, clothingType: string) => {
    const key = getPresetKey(gender, clothingType);
    const preset = COLUMN_PRESETS[key];
    if (preset && rows.length <= 1 && columns.length <= 1) {
      setColumns(preset);
      // Create 5 empty rows matching preset column count
      setRows(Array.from({ length: 5 }, () => Array.from({ length: preset.length }, () => "")));
    }
  };

  const addColumn = () => {
    const name = newColumnName.trim();
    if (!name) {
      toast.error("Enter a column heading");
      return;
    }
    if (columns.includes(name)) {
      toast.error("Column already exists");
      return;
    }
    setColumns([...columns, name]);
    setRows(rows.map((row) => [...row, ""]));
    setNewColumnName("");
  };

  const removeColumn = (colIdx: number) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((_, i) => i !== colIdx));
    setRows(rows.map((row) => row.filter((_, i) => i !== colIdx)));
  };

  const updateColumnHeading = (colIdx: number, value: string) => {
    setColumns(columns.map((col, i) => (i === colIdx ? value : col)));
  };

  const addRow = () => {
    setRows([...rows, Array.from({ length: columns.length }, () => "")]);
  };

  const removeRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== rowIdx));
  };

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    setRows(
      rows.map((row, rIdx) => (rIdx === rowIdx ? row.map((cell, cIdx) => (cIdx === colIdx ? value : cell)) : row)),
    );
  };

  const handleSave = async () => {
    if (!form.name || !form.gender || !form.clothingType) {
      toast.error("Name, gender, and clothing type are required");
      return;
    }
    if (columns.length < 2) {
      toast.error("At least 2 columns required (Size + one measurement)");
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: form.name,
        gender: form.gender,
        clothingType: form.clothingType,
        unit: form.unit,
        columns: JSON.stringify(columns),
        rows: JSON.stringify(rows),
        measureImage: form.measureImage,
      };

      if (editingGuide) {
        await updateSizeGuide(editingGuide.$id, data);
        toast.success("Size guide updated");
      } else {
        await createSizeGuide(data);
        toast.success("Size guide created");
      }
      setDialogOpen(false);
      fetchGuides();
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save size guide");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGuide) return;
    try {
      await deleteSizeGuide(deletingGuide.$id);
      toast.success("Size guide deleted");
      setDeleteDialogOpen(false);
      setDeletingGuide(null);
      fetchGuides();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete size guide");
    }
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Size Guides</h1>
          <p className="text-muted-foreground text-sm">Manage size charts for men&apos;s and women&apos;s clothing</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          Add Size Guide
        </Button>
      </div>

      {/* Men's Guides */}
      <Card>
        <CardHeader>
          <CardTitle>Men&apos;s Size Guides ({guides.filter((g) => g.gender === "men").length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : guides.filter((g) => g.gender === "men").length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No men&apos;s size guides yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Clothing Type</TableHead>
                  <TableHead>Sizes</TableHead>
                  <TableHead>Columns</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guides
                  .filter((g) => g.gender === "men")
                  .map((guide) => {
                    const rws = parseJsonSafe<string[][]>(guide.rows, []);
                    const cols = parseJsonSafe<string[]>(guide.columns, []);
                    return (
                      <TableRow key={guide.$id}>
                        <TableCell className="font-medium">{guide.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{guide.clothingType}</Badge>
                        </TableCell>
                        <TableCell>{rws.length} sizes</TableCell>
                        <TableCell>{cols.length} columns</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(guide)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setDeletingGuide(guide);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="size-4" />
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

      {/* Women's Guides */}
      <Card>
        <CardHeader>
          <CardTitle>Women&apos;s Size Guides ({guides.filter((g) => g.gender === "women").length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : guides.filter((g) => g.gender === "women").length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No women&apos;s size guides yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Clothing Type</TableHead>
                  <TableHead>Sizes</TableHead>
                  <TableHead>Columns</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guides
                  .filter((g) => g.gender === "women")
                  .map((guide) => {
                    const rws = parseJsonSafe<string[][]>(guide.rows, []);
                    const cols = parseJsonSafe<string[]>(guide.columns, []);
                    return (
                      <TableRow key={guide.$id}>
                        <TableCell className="font-medium">{guide.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{guide.clothingType}</Badge>
                        </TableCell>
                        <TableCell>{rws.length} sizes</TableCell>
                        <TableCell>{cols.length} columns</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(guide)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setDeletingGuide(guide);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="size-4" />
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

      {/* Unisex Guides */}
      {guides.filter((g) => g.gender === "unisex").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unisex Size Guides ({guides.filter((g) => g.gender === "unisex").length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Clothing Type</TableHead>
                  <TableHead>Sizes</TableHead>
                  <TableHead>Columns</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guides
                  .filter((g) => g.gender === "unisex")
                  .map((guide) => {
                    const rws = parseJsonSafe<string[][]>(guide.rows, []);
                    const cols = parseJsonSafe<string[]>(guide.columns, []);
                    return (
                      <TableRow key={guide.$id}>
                        <TableCell className="font-medium">{guide.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{guide.clothingType}</Badge>
                        </TableCell>
                        <TableCell>{rws.length} sizes</TableCell>
                        <TableCell>{cols.length} columns</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(guide)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setDeletingGuide(guide);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingGuide ? "Edit Size Guide" : "New Size Guide"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sg-name">Name *</Label>
                <Input
                  id="sg-name"
                  value={form.name}
                  placeholder="e.g. Men's Hoodie Size Guide"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <SearchableSelect
                  value={form.unit}
                  onValueChange={(value) => setForm({ ...form, unit: value })}
                  options={UNIT_OPTIONS}
                  placeholder="Select unit"
                  searchPlaceholder="Search..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender *</Label>
                <SearchableSelect
                  value={form.gender || undefined}
                  onValueChange={(value) => {
                    setForm({ ...form, gender: value });
                    if (form.clothingType) handlePresetLoad(value, form.clothingType);
                  }}
                  options={GENDER_OPTIONS}
                  placeholder="Select gender"
                  searchPlaceholder="Search..."
                />
              </div>
              <div className="space-y-2">
                <Label>Clothing Type *</Label>
                <SearchableSelect
                  value={form.clothingType || undefined}
                  onValueChange={(value) => {
                    setForm({ ...form, clothingType: value });
                    if (form.gender) handlePresetLoad(form.gender, value);
                  }}
                  options={CLOTHING_TYPES.map((t) => ({ value: t, label: t }))}
                  placeholder="Select type"
                  searchPlaceholder="Search types..."
                />
              </div>
            </div>

            {/* Column Management */}
            <div className="space-y-2">
              <Label>Column Headings</Label>
              <div className="flex flex-wrap gap-2">
                {columns.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-1 rounded border bg-muted/50 px-2 py-1">
                    <Input
                      className="h-6 w-28 border-0 bg-transparent p-0 text-xs focus-visible:ring-0"
                      value={col}
                      onChange={(e) => updateColumnHeading(idx, e.target.value)}
                    />
                    {idx > 0 && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeColumn(idx)}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 w-48 text-sm"
                  placeholder="New column heading"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addColumn();
                    }
                  }}
                />
                <Button size="sm" variant="outline" onClick={addColumn}>
                  <Plus className="mr-1 size-3" />
                  Add Column
                </Button>
              </div>
            </div>

            {/* Size Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Size Grid</Label>
                <Button size="sm" variant="outline" onClick={addRow}>
                  <Plus className="mr-1 size-3" />
                  Add Row
                </Button>
              </div>
              <div className="overflow-x-auto rounded border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {columns.map((col, idx) => (
                        <th key={idx} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                          {col}
                        </th>
                      ))}
                      <th className="w-10 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b last:border-0">
                        {columns.map((_, cIdx) => (
                          <td key={cIdx} className="px-1 py-1">
                            <Input
                              className="h-8 text-sm"
                              value={row[cIdx] ?? ""}
                              onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                            />
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          {rows.length > 1 && (
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => removeRow(rIdx)}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* How to Measure Image */}
            <div className="space-y-2">
              <Label>How to Measure Image (optional)</Label>
              <p className="text-muted-foreground text-xs">
                Upload a diagram showing how to measure. This will appear in a &quot;How to Measure&quot; tab on the
                frontend.
              </p>
              {form.measureImage ? (
                <div className="relative inline-block">
                  <img
                    src={form.measureImage}
                    alt="How to measure"
                    className="max-h-48 rounded border object-contain"
                  />
                  <button
                    type="button"
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                    onClick={() => setForm({ ...form, measureImage: "" })}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  <ImageIcon className="size-5" />
                  {uploadingImage ? "Uploading..." : "Click to upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingImage(true);
                      try {
                        const url = await uploadImage(file);
                        setForm((prev) => ({ ...prev, measureImage: url }));
                        toast.success("Image uploaded");
                      } catch (err) {
                        console.error("Upload failed:", err);
                        toast.error("Failed to upload image");
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingImage}>
              {saving ? "Saving..." : editingGuide ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Size Guide</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Are you sure you want to delete &quot;{deletingGuide?.name}&quot;? This action cannot be undone.
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
