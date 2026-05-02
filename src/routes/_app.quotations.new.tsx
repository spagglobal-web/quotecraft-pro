import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, FileText, Sparkles } from "lucide-react";
import { computePricing, formatINR, type DiscountType } from "@/lib/pricing";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/quotations/new")({
  loader: async () => {
    const { data } = await supabase
      .from("purifier_models")
      .select("*")
      .eq("active", true)
      .order("model_name");
    return { models: data ?? [] };
  },
  component: NewQuotation,
});

interface DraftItem {
  key: string;
  model_id: string | null;
  item_name: string;
  description: string;
  features: string[];
  image_url: string | null;
  quantity: number;
  unit_price: number;
}

const blankItem = (): DraftItem => ({
  key: crypto.randomUUID(),
  model_id: null,
  item_name: "",
  description: "",
  features: [],
  image_url: null,
  quantity: 1,
  unit_price: 0,
});

function NewQuotation() {
  const { models } = Route.useLoaderData();
  const navigate = useNavigate();

  // Customer
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // Items
  const [items, setItems] = useState<DraftItem[]>([blankItem()]);

  // Pricing controls
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstPct, setGstPct] = useState(18);
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState(0);

  // Meta
  const [validityDays, setValidityDays] = useState(7);
  const [notes, setNotes] = useState("Free installation included. Warranty as per manufacturer.");
  const [terms, setTerms] = useState(
    "1. Prices are valid for the period mentioned.\n2. Payment terms: 50% advance, balance on delivery.\n3. Delivery within 7 working days from PO.\n4. GST extra as applicable.",
  );
  const [saving, setSaving] = useState(false);

  const pricing = useMemo(
    () => computePricing({
      items: items.map((i) => ({ quantity: i.quantity, unit_price: i.unit_price })),
      gstEnabled, gstPercentage: gstPct, discountType, discountValue,
    }),
    [items, gstEnabled, gstPct, discountType, discountValue],
  );

  const update = (key: string, patch: Partial<DraftItem>) =>
    setItems((arr) => arr.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const pickModel = (key: string, modelId: string) => {
    if (modelId === "__custom__") {
      update(key, {
        model_id: null, item_name: "", description: "", features: [], image_url: null, unit_price: 0,
      });
      return;
    }
    const m = models.find((x) => x.id === modelId);
    if (!m) return;
    update(key, {
      model_id: m.id,
      item_name: m.model_name,
      description: m.description ?? "",
      features: m.features ?? [],
      image_url: m.image_url ?? null,
      unit_price: Number(m.price),
    });
  };

  async function save(status: "draft" | "sent") {
    if (!name.trim()) return toast.error("Customer name is required");
    if (items.length === 0 || items.every((i) => !i.item_name)) {
      return toast.error("Add at least one item");
    }
    setSaving(true);
    try {
      const { data: cust, error: cErr } = await supabase
        .from("customers")
        .insert([{ name, mobile, email, address }])
        .select()
        .single();
      if (cErr) throw cErr;

      const { data: quote, error: qErr } = await supabase
        .from("quotations")
        .insert([{
          customer_id: cust.id,
          subtotal: pricing.subtotal,
          gst_amount: pricing.gstAmount,
          gst_percentage: gstPct,
          gst_enabled: gstEnabled,
          discount_value: discountValue,
          discount_type: discountType,
          discount_amount: pricing.discountAmount,
          total_amount: pricing.total,
          status,
          validity_days: validityDays,
          notes, terms,
        })
        .select()
        .single();
      if (qErr) throw qErr;

      const lineItems = items
        .filter((i) => i.item_name)
        .map((i, idx) => ({
          quotation_id: quote.id,
          model_id: i.model_id,
          item_name: i.item_name,
          description: i.description,
          features: i.features,
          image_url: i.image_url,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: Number(i.quantity) * Number(i.unit_price),
          position: idx,
        }));
      const { error: iErr } = await supabase.from("quotation_items").insert(lineItems);
      if (iErr) throw iErr;

      toast.success(`Quotation ${quote.quotation_number} saved`);
      navigate({ to: "/quotations/$id", params: { id: quote.id } });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Failed to save quotation");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">New Quotation</h1>
          <p className="text-sm text-muted-foreground">
            Build a polished, branded quotation with live pricing.
          </p>
        </header>

        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Company / Customer Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Industries Pvt Ltd" />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile Number</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="purchase@acme.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Validity (days)</Label>
              <Input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value) || 7)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Address</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, State, Pincode" rows={2} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Products & Items</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setItems((a) => [...a, blankItem()])}>
              <Plus className="mr-1 h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.key} className="rounded-lg border bg-gradient-to-b from-card to-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Item #{idx + 1}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setItems((a) => a.filter((x) => x.key !== item.key))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                  <div className="flex h-32 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.item_name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="text-center text-xs text-muted-foreground">
                        <Sparkles className="mx-auto mb-1 h-5 w-5" />
                        No image
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label>Choose product</Label>
                      <Select onValueChange={(v) => pickModel(item.key, v)} value={item.model_id ?? ""}>
                        <SelectTrigger><SelectValue placeholder="Select from catalog or custom..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__custom__">✏️ Custom item (Installation, AMC, etc.)</SelectItem>
                          {models.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.model_name} — {formatINR(Number(m.price))}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Item name</Label>
                        <Input value={item.item_name} onChange={(e) => update(item.key, { item_name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Image URL (optional)</Label>
                        <Input value={item.image_url ?? ""} onChange={(e) => update(item.key, { image_url: e.target.value })} placeholder="https://..." />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea rows={2} value={item.description} onChange={(e) => update(item.key, { description: e.target.value })} />
                    </div>
                    {item.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.features.map((f, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Quantity</Label>
                        <Input type="number" min={1} value={item.quantity} onChange={(e) => update(item.key, { quantity: Number(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label>Unit Price (₹)</Label>
                        <Input type="number" min={0} value={item.unit_price} onChange={(e) => update(item.key, { unit_price: Number(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label>Total</Label>
                        <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 font-mono text-sm font-semibold">
                          {formatINR((item.quantity || 0) * (item.unit_price || 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notes & Terms</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Notes</Label>
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <Label>Terms & Conditions</Label>
              <Textarea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky pricing sidebar */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card className="border-2 border-primary/15 shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="text-base">Pricing Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <Label className="m-0">Apply GST</Label>
                <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
              </div>
              <div className={gstEnabled ? "" : "pointer-events-none opacity-50"}>
                <Label className="text-xs">GST Percentage (%)</Label>
                <Input type="number" min={0} max={100} value={gstPct} onChange={(e) => setGstPct(Number(e.target.value) || 0)} />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <Label className="m-0">Discount</Label>
              <div className="flex gap-2">
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">% Percent</SelectItem>
                    <SelectItem value="fixed">₹ Fixed</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value) || 0)} />
              </div>
            </div>

            <div className="space-y-1.5 rounded-lg border bg-gradient-to-b from-background to-muted/40 p-4 font-mono text-sm">
              <Row label="Subtotal" value={formatINR(pricing.subtotal)} />
              {pricing.discountAmount > 0 && (
                <Row label={`Discount (${discountType === "percentage" ? `${discountValue}%` : "₹"})`} value={`- ${formatINR(pricing.discountAmount)}`} />
              )}
              {gstEnabled && <Row label={`GST (${gstPct}%)`} value={formatINR(pricing.gstAmount)} />}
              <div className="my-2 h-px bg-border" />
              <div className="flex items-center justify-between text-base">
                <span className="font-bold">Grand Total</span>
                <span className="font-bold text-primary">{formatINR(pricing.total)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button className="w-full" size="lg" disabled={saving} onClick={() => save("sent")}>
                <FileText className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save & Generate"}
              </Button>
              <Button className="w-full" variant="outline" disabled={saving} onClick={() => save("draft")}>
                <Save className="mr-2 h-4 w-4" /> Save as Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
