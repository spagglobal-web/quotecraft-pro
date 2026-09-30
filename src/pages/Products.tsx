import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { formatINR } from "@/lib/pricing";
import { toast } from "sonner";

type PurifierModel = Database["public"]["Tables"]["purifier_models"]["Row"];
type ColorVariant = { id: string; name: string; image_url: string };
type ProductModel = Omit<PurifierModel, "color_variants"> & { color_variants: ColorVariant[] };
type ProductForm = Omit<Partial<PurifierModel>, "color_variants"> & { color_variants?: ColorVariant[] };
const categories = ["Purifier", "Pump", "Cabinet"];

function parseColorVariants(value: unknown): ColorVariant[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((variant, index) => {
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) return [];
    const record = variant as Record<string, unknown>;
    if (typeof record.name !== "string" || typeof record.image_url !== "string") return [];
    return [{ id: typeof record.id === "string" ? record.id : `color-${index}`, name: record.name, image_url: record.image_url }];
  });
}

export default function Products() {
  const [models, setModels] = useState<ProductModel[]>([]);
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    const { data } = await supabase.from("purifier_models").select("*").order("created_at", { ascending: false });
    setModels((data ?? []).map((model) => ({ ...model, color_variants: parseColorVariants(model.color_variants) })) as ProductModel[]);
  }
  useEffect(() => { load(); }, []);

  async function uploadImage(file: File, onUploaded: (url: string) => void) {
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`.replace(/[^a-z0-9\-_.]/gi, "");
      const { error } = await supabase.storage.from("product_images").upload(fileName, file, { upsert: true, cacheControl: "3600" });
      if (error) throw new Error(error.message);
      const { data: publicUrl } = supabase.storage.from("product_images").getPublicUrl(fileName);
      onUploaded(publicUrl.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!editing?.model_name) return toast.error("Model name required");
    const colorVariants = editing.color_variants ?? [];
    if (colorVariants.some((variant) => !variant.name.trim() || !variant.image_url.trim())) {
      return toast.error("Each colour needs a name and photo");
    }
    const payload = {
      model_name: editing.model_name,
      category: editing.category ?? "Purifier",
      price: Number(editing.price ?? 0),
      description: editing.description ?? "",
      features: editing.features ?? [],
      image_url: editing.image_url ?? null,
      color_variants: colorVariants,
      gst_percentage: Number(editing.gst_percentage ?? 18),
      active: editing.active ?? true,
    };
    const { error } = editing.id
      ? await supabase.from("purifier_models").update(payload).eq("id", editing.id)
      : await supabase.from("purifier_models").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("purifier_models").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Manage your water purifier catalog.</p>
        </div>
        <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setPreview(null); } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing({ active: true, gst_percentage: 18, category: "Purifier", features: [], color_variants: [] }); setPreview(null); }}>
              <Plus className="mr-2 h-4 w-4" /> New Product
            </Button>
          </DialogTrigger>
          {editing && (
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} Product</DialogTitle></DialogHeader>
              <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-1">
                <div><Label>Model Name *</Label><Input value={editing.model_name ?? ""} onChange={(e) => setEditing({ ...editing, model_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select value={editing.category ?? "Purifier"} onValueChange={(category) => setEditing({ ...editing, category })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {!categories.includes(editing.category ?? "") && editing.category && <SelectItem value={editing.category}>{editing.category}</SelectItem>}
                        {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Price (₹)</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                </div>
                <div><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                <div>
                  <Label>Features (one per line)</Label>
                  <Textarea value={(editing.features ?? []).join("\n")} onChange={(e) => setEditing({ ...editing, features: e.target.value.split("\n").map((f) => f.trim()).filter(Boolean) })} />
                </div>
                <div className="space-y-3">
                  <Label>Product Image</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
                    <Upload className="mr-2 h-4 w-4" /> {uploading ? "Uploading..." : "Upload Photo"}
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], (url) => { setEditing((prev) => prev ? { ...prev, image_url: url } : prev); setPreview(url); })} className="hidden" />
                  <Label className="text-xs text-muted-foreground">Or paste URL</Label>
                  <Input value={editing.image_url ?? ""} onChange={(e) => { setEditing({ ...editing, image_url: e.target.value }); setPreview(e.target.value); }} placeholder="https://..." />
                  {preview && <div className="rounded-lg border bg-muted p-2"><img src={preview} alt="Preview" className="max-h-36 w-auto object-contain" onError={() => setPreview(null)} /></div>}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Colour Photos</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing({ ...editing, color_variants: [...(editing.color_variants ?? []), { id: crypto.randomUUID(), name: "", image_url: "" }] })}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Colour
                    </Button>
                  </div>
                  {(editing.color_variants ?? []).map((variant) => (
                    <div key={variant.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-md border p-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input value={variant.name} onChange={(e) => setEditing({ ...editing, color_variants: editing.color_variants?.map((item) => item.id === variant.id ? { ...item, name: e.target.value } : item) })} placeholder="Colour name" aria-label="Colour name" />
                        <div className="flex gap-2">
                          <Input value={variant.image_url} onChange={(e) => setEditing({ ...editing, color_variants: editing.color_variants?.map((item) => item.id === variant.id ? { ...item, image_url: e.target.value } : item) })} placeholder="Photo URL" aria-label="Colour photo URL" />
                          <Button type="button" variant="outline" size="icon" aria-label={`Upload ${variant.name || "colour"} photo`} onClick={() => colorInputRefs.current[variant.id]?.click()} disabled={uploading}><Upload className="h-4 w-4" /></Button>
                          <input ref={(element) => { colorInputRefs.current[variant.id] = element; }} type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadImage(file, (url) => setEditing((prev) => prev ? { ...prev, color_variants: prev.color_variants?.map((item) => item.id === variant.id ? { ...item, image_url: url } : item) } : prev));
                            e.target.value = "";
                          }} className="hidden" />
                        </div>
                        {variant.image_url && <img src={variant.image_url} alt={`${variant.name || "Colour"} preview`} className="h-16 w-20 rounded border object-contain" />}
                      </div>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${variant.name || "colour"}`} onClick={() => setEditing({ ...editing, color_variants: editing.color_variants?.filter((item) => item.id !== variant.id) })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>GST %</Label><Input type="number" value={editing.gst_percentage ?? 18} onChange={(e) => setEditing({ ...editing, gst_percentage: Number(e.target.value) })} /></div>
                  <div className="flex items-end gap-2"><Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /><Label className="m-0">Active</Label></div>
                </div>
              </div>
              <DialogFooter><Button onClick={save}>Save Product</Button></DialogFooter>
            </DialogContent>
          )}
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <Card key={m.id} className="overflow-hidden transition hover:shadow-[var(--shadow-elegant)]">
            <div className="flex h-36 items-center justify-center bg-gradient-to-br from-muted to-accent">
              {m.image_url ? <img src={m.image_url} className="max-h-full max-w-full object-contain" alt={m.model_name} /> : <span className="text-xs text-muted-foreground">No image</span>}
            </div>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-tight">{m.model_name}</CardTitle>
                {!m.active && <Badge variant="secondary">Inactive</Badge>}
              </div>
              <Badge variant="outline" className="w-fit">{m.category}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xl font-bold text-primary">{formatINR(Number(m.price))}</div>
              {m.description && <p className="line-clamp-2 text-xs text-muted-foreground">{m.description}</p>}
              {m.color_variants.length > 0 && <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground">Colours</p><div className="flex gap-2 overflow-x-auto pb-1">{m.color_variants.map((variant) => <div key={variant.id} className="w-14 shrink-0 text-center"><img src={variant.image_url} alt={variant.name} className="h-12 w-14 rounded border object-cover" /><span className="block truncate text-[10px]" title={variant.name}>{variant.name}</span></div>)}</div></div>}
              <div className="flex flex-wrap gap-1">
                {m.features?.slice(0, 3).map((f, i) => <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>)}
              </div>
              <div className="flex justify-end gap-1 pt-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditing({ ...m }); setPreview(m.image_url ?? null); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
