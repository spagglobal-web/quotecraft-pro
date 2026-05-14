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
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { formatINR } from "@/lib/pricing";
import { toast } from "sonner";

type PurifierModel = Database["public"]["Tables"]["purifier_models"]["Row"];

export default function Products() {
  const [models, setModels] = useState<PurifierModel[]>([]);
  const [editing, setEditing] = useState<Partial<PurifierModel> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const { data } = await supabase.from("purifier_models").select("*").order("created_at", { ascending: false });
    setModels((data ?? []) as PurifierModel[]);
  }
  useEffect(() => { load(); }, []);

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`.replace(/[^a-z0-9\-_.]/gi, "");
      const { error } = await supabase.storage.from("product_images").upload(fileName, file, { upsert: true, cacheControl: "3600" });
      if (error) throw new Error(error.message);
      const { data: publicUrl } = supabase.storage.from("product_images").getPublicUrl(fileName);
      setEditing((prev) => ({ ...prev, image_url: publicUrl.publicUrl }));
      setPreview(publicUrl.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!editing?.model_name) return toast.error("Model name required");
    const payload = {
      model_name: editing.model_name,
      category: editing.category ?? "RO",
      price: Number(editing.price ?? 0),
      description: editing.description ?? "",
      features: editing.features ?? [],
      image_url: editing.image_url ?? null,
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
            <Button onClick={() => { setEditing({ active: true, gst_percentage: 18, category: "RO", features: [] }); setPreview(null); }}>
              <Plus className="mr-2 h-4 w-4" /> New Product
            </Button>
          </DialogTrigger>
          {editing && (
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} Product</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Model Name *</Label><Input value={editing.model_name ?? ""} onChange={(e) => setEditing({ ...editing, model_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Category</Label><Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
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
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} className="hidden" />
                  <Label className="text-xs text-muted-foreground">Or paste URL</Label>
                  <Input value={editing.image_url ?? ""} onChange={(e) => { setEditing({ ...editing, image_url: e.target.value }); setPreview(e.target.value); }} placeholder="https://..." />
                  {preview && <div className="rounded-lg border bg-muted p-2"><img src={preview} alt="Preview" className="max-h-36 w-auto object-contain" onError={() => setPreview(null)} /></div>}
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
              <div className="flex flex-wrap gap-1">
                {m.features?.slice(0, 3).map((f, i) => <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>)}
              </div>
              <div className="flex justify-end gap-1 pt-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(m); setPreview(m.image_url ?? null); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
