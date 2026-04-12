"use client";

import { useCallback, useEffect, useState } from "react";

import { ImageIcon, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CharCount } from "@/components/ui/char-count";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadImage } from "@/lib/appwrite/cloudinary";
import { getHeroesByPrefix, updateHero } from "@/lib/appwrite/heroes";
import type { Hero } from "@/lib/appwrite/types";

export interface SectionLabel {
  label: string;
  description: string;
}

interface HeroSectionPageProps {
  title: string;
  description: string;
  prefix: string;
  sectionLabels: Record<string, SectionLabel>;
}

interface HeroForm {
  title: string;
  subtitle: string;
  description: string;
  tagline: string;
  ctaText: string;
  ctaLink: string;
}

const emptyForm: HeroForm = {
  title: "",
  subtitle: "",
  description: "",
  tagline: "",
  ctaText: "",
  ctaLink: "",
};

export function HeroSectionPage({ title, description, prefix, sectionLabels }: HeroSectionPageProps) {
  const [heroes, setHeroes] = useState<Hero[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHero, setEditingHero] = useState<Hero | null>(null);
  const [form, setForm] = useState<HeroForm>(emptyForm);
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchHeroes = useCallback(async () => {
    try {
      const res = await getHeroesByPrefix(prefix);
      setHeroes(res);
    } catch (error) {
      console.error("Failed to fetch heroes:", error);
      toast.error("Failed to load hero sections");
    } finally {
      setLoading(false);
    }
  }, [prefix]);

  useEffect(() => {
    fetchHeroes();
  }, [fetchHeroes]);

  const handleEdit = (hero: Hero) => {
    setEditingHero(hero);
    setForm({
      title: hero.title || "",
      subtitle: hero.subtitle || "",
      description: hero.description || "",
      tagline: hero.tagline || "",
      ctaText: hero.ctaText || "",
      ctaLink: hero.ctaLink || "",
    });
    setImage(hero.image || "");
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
    if (!editingHero) return;
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        tagline: form.tagline,
        ctaText: form.ctaText,
        ctaLink: form.ctaLink,
        image,
      };

      await updateHero(editingHero.$id, data);
      toast.success("Hero section updated");
      setDialogOpen(false);
      fetchHeroes();
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save hero section");
    } finally {
      setSaving(false);
    }
  };

  const getSectionInfo = (key: string): SectionLabel => {
    return sectionLabels[key] || { label: key, description: "" };
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">Loading hero sections...</div>
      ) : heroes.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          No hero sections found. Please run the setup script to seed initial data.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {heroes.map((hero) => {
            const info = getSectionInfo(hero.sectionKey);
            return (
              <Card key={hero.$id} className="overflow-hidden">
                {hero.image ? (
                  <div className="relative h-40 w-full overflow-hidden bg-muted">
                    <img src={hero.image} alt={info.label} className="size-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-4 text-white">
                      <p className="font-semibold text-sm">{info.label}</p>
                      <p className="text-xs text-white/70">{info.description}</p>
                    </div>
                  </div>
                ) : (
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{info.label}</CardTitle>
                    <CardDescription>{info.description}</CardDescription>
                  </CardHeader>
                )}
                <CardContent className={hero.image ? "pt-4" : ""}>
                  <div className="space-y-2 text-sm">
                    {hero.title && (
                      <div>
                        <span className="font-medium text-muted-foreground">Title: </span>
                        <span className="line-clamp-1">{hero.title}</span>
                      </div>
                    )}
                    {hero.subtitle && (
                      <div>
                        <span className="font-medium text-muted-foreground">Subtitle: </span>
                        <span className="line-clamp-1">{hero.subtitle}</span>
                      </div>
                    )}
                    {hero.tagline && (
                      <div>
                        <span className="font-medium text-muted-foreground">Tagline: </span>
                        <span className="line-clamp-1">{hero.tagline}</span>
                      </div>
                    )}
                    {hero.ctaText && (
                      <div>
                        <span className="font-medium text-muted-foreground">CTA: </span>
                        <span>{hero.ctaText}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(hero)}>
                      <Pencil className="mr-2 size-3" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit {editingHero ? getSectionInfo(editingHero.sectionKey).label : "Hero Section"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <CharCount current={form.title.length} max={500} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
              <CharCount current={form.subtitle.length} max={1000} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              />
              <CharCount current={form.tagline.length} max={500} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
              <CharCount current={form.description.length} max={5000} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ctaText">CTA Text</Label>
                <Input
                  id="ctaText"
                  value={form.ctaText}
                  onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                />
                <CharCount current={form.ctaText.length} max={255} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaLink">CTA Link</Label>
                <Input
                  id="ctaLink"
                  value={form.ctaLink}
                  onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
                />
                <CharCount current={form.ctaLink.length} max={500} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hero Image</Label>
              <div className="flex items-center gap-4">
                {image ? (
                  <div className="group relative h-28 w-full overflow-hidden rounded-md border">
                    <img src={image} alt="Hero" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImage("")}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="size-5 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-28 w-full cursor-pointer items-center justify-center rounded-md border border-dashed hover:bg-muted">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {uploading ? (
                      <span className="text-muted-foreground text-sm">Uploading...</span>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <ImageIcon className="size-6 text-muted-foreground" />
                        <span className="text-muted-foreground text-xs">Click to upload</span>
                      </div>
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
              {saving ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
