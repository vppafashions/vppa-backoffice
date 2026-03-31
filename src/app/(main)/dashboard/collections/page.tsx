"use client";

import { useCallback, useEffect, useState } from "react";

import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage } from "@/lib/appwrite/cloudinary";
import { createCollection, deleteCollection, getCollections, updateCollection } from "@/lib/appwrite/collections";
import type { Collection } from "@/lib/appwrite/types";

interface CollectionForm {
  name: string;
  slug: string;
  description: string;
  tagline: string;
}

const emptyForm: CollectionForm = {
  name: "",
  slug: "",
  description: "",
  tagline: "",
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<Collection | null>(null);
  const [form, setForm] = useState<CollectionForm>(emptyForm);
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await getCollections();
      setCollections(res.documents as Collection[]);
    } catch (error) {
      console.error("Failed to fetch collections:", error);
      toast.error("Failed to load collections");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleNew = () => {
    setEditingCollection(null);
    setForm(emptyForm);
    setImage("");
    setDialogOpen(true);
  };

  const handleEdit = (collection: Collection) => {
    setEditingCollection(collection);
    setForm({
      name: collection.name,
      slug: collection.slug,
      description: collection.description || "",
      tagline: collection.tagline || "",
    });
    setImage(collection.image || "");
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImage(url);
      toast.success("Image uploaded");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast.error("Name and slug are required");
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        tagline: form.tagline,
        image,
      };

      if (editingCollection) {
        await updateCollection(editingCollection.$id, data);
        toast.success("Collection updated");
      } else {
        await createCollection(data);
        toast.success("Collection created");
      }
      setDialogOpen(false);
      fetchCollections();
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save collection");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCollection) return;
    try {
      await deleteCollection(deletingCollection.$id);
      toast.success("Collection deleted");
      setDeleteDialogOpen(false);
      setDeletingCollection(null);
      fetchCollections();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete collection");
    }
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Collections</h1>
          <p className="text-muted-foreground text-sm">Manage product collections</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 size-4" />
          Add Collection
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Collections ({collections.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading collections...</div>
          ) : collections.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No collections yet. Click &quot;Add Collection&quot; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Tagline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((collection) => (
                  <TableRow key={collection.$id}>
                    <TableCell>
                      {collection.image ? (
                        <img src={collection.image} alt={collection.name} className="size-10 rounded object-cover" />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded bg-muted">
                          <ImageIcon className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{collection.name}</TableCell>
                    <TableCell className="text-muted-foreground">{collection.slug}</TableCell>
                    <TableCell className="text-muted-foreground">{collection.tagline || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(collection)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDeletingCollection(collection);
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCollection ? "Edit Collection" : "New Collection"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  placeholder="e.g. velocity"
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              />
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

            <div className="space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-4">
                {image ? (
                  <div className="group relative size-20 overflow-hidden rounded-md border">
                    <img src={image} alt="Collection" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImage("")}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="size-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex size-20 cursor-pointer items-center justify-center rounded-md border border-dashed hover:bg-muted">
                    <input
                      type="file"
                      accept="image/*"
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
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingCollection ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Collection</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete &quot;{deletingCollection?.name}&quot;? This action cannot be undone.</p>
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
