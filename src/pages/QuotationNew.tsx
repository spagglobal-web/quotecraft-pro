import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, FileText, Sparkles } from "lucide-react";
import { computePricing, formatINR, type DiscountType } from "@/lib/pricing";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface DraftItem {
  key: string; model_id: string | null; productType: "purifier" | "pump" | "membrane"; item_name: string; description: string;
  features: string[]; image_url: string | null; color_name: string; quantity: number; base_unit_price: number;
  accessories: QuotationAccessory[];
}
interface QuotationAccessory {
  productType: "pump" | "membrane"; model_id: string | null; item_name: string; description: string;
  image_url: string | null; unit_price: number;
}
const blankItem = (productType: DraftItem["productType"] = "purifier"): DraftItem => ({
  key: crypto.randomUUID(), model_id: null, productType, item_name: "", description: "",
  features: [], image_url: null, color_name: "", quantity: 1, base_unit_price: 0, accessories: [],
});
const productTypeForModel = (availableModels: any[], modelId: string | null): DraftItem["productType"] => {
  const category = String(availableModels.find((model) => model.id === modelId)?.category ?? "").toLowerCase();
  if (category.includes("pump")) return "pump";
  if (category.includes("membrane")) return "membrane";
  return "purifier";
};
const ACCOUNT_HOLDER_NAME = "SPAG EAGLE GLOBAL PRIVATE LIMITED";

export default function QuotationNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [models, setModels] = useState<any[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("purifier_models").select("*").eq("active", true).order("model_name");
      setModels(data ?? []);
      setModelsLoaded(true);
    })();
  }, []);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [customQuotationNumber, setCustomQuotationNumber] = useState("");
  const [items, setItems] = useState<DraftItem[]>([blankItem("purifier")]);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [cgstPct, setCgstPct] = useState(9);
  const [sgstPct, setSgstPct] = useState(9);
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [validityDays, setValidityDays] = useState(7);
  const [notes, setNotes] = useState("Free installation included. Warranty as per manufacturer.");
  const [terms, setTerms] = useState("1. Prices are valid for the period mentioned.\n2. Payment terms: 50% advance, balance on delivery.\n3. Delivery within 7 working days from PO.\n4. GST extra as applicable.");
  const [accountNumber, setAccountNumber] = useState("45119431098");
  const [ifscCode, setIfscCode] = useState("SBIN0001613");
  const [bankName, setBankName] = useState("STATE BANK OF INDIA");
  const [bankBranch, setBankBranch] = useState("ADB PONDICHERRY");
  const [accountHolderName, setAccountHolderName] = useState(ACCOUNT_HOLDER_NAME);
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"draft" | "sent" | "approved">("draft");

  useEffect(() => {
    if (!id || !modelsLoaded) return;
    (async () => {
      const { data: quotation, error } = await (supabase as any).from("quotations").select("*, customers(*), quotation_items(*)").eq("id", id).single();
      if (error || !quotation) return toast.error(error?.message ?? "Quotation not found");
      const customer = quotation.customers ?? {};
      setName(customer.name ?? ""); setMobile(customer.mobile ?? ""); setEmail(customer.email ?? ""); setAddress(customer.address ?? "");
      setGstNumber(quotation.buyer_gst_number ?? customer.gst_number ?? ""); setCustomQuotationNumber(quotation.custom_quotation_number ?? "");
      setStatus(quotation.status === "sent" || quotation.status === "approved" ? quotation.status : "draft");
      setQuotationDate((quotation.quotation_date ?? quotation.created_at ?? "").slice(0, 10)); setValidityDays(Number(quotation.validity_days ?? 7));
      setGstEnabled(Boolean(quotation.gst_enabled)); setCgstPct(Number(quotation.cgst_percentage ?? 9)); setSgstPct(Number(quotation.sgst_percentage ?? 9));
      setDiscountType((quotation.discount_type ?? "percentage") as DiscountType); setDiscountValue(Number(quotation.discount_value ?? 0));
      setNotes(quotation.notes ?? ""); setTerms(quotation.terms ?? ""); setAccountNumber(quotation.account_number ?? ""); setIfscCode(quotation.ifsc_code ?? "");
      setBankName(quotation.bank_name ?? ""); setBankBranch(quotation.bank_branch ?? ""); setAccountHolderName(ACCOUNT_HOLDER_NAME);
      const savedItems = (quotation.quotation_items ?? []).sort((a: any, b: any) => a.position - b.position);
      const firstPurifier = savedItems.find((item: any) => productTypeForModel(models, item.model_id) === "purifier");
      const legacyAccessories = firstPurifier ? savedItems.filter((item: any) =>
        ["pump", "membrane"].includes(productTypeForModel(models, item.model_id))
      ) : [];
      const accessoriesForFirst = [
        ...(firstPurifier?.accessories ?? []),
        ...legacyAccessories.map((item: any) => ({
          productType: productTypeForModel(models, item.model_id), model_id: item.model_id,
          item_name: item.item_name ?? "", description: item.description ?? "", image_url: item.image_url ?? null,
          unit_price: Number(item.unit_price ?? 0),
        })),
      ];
      setItems(savedItems.filter((item: any) => !legacyAccessories.includes(item)).map((item: any) => {
        const savedAccessories = item.accessories ?? [];
        const accessories = item === firstPurifier ? accessoriesForFirst : savedAccessories;
        return {
          key: item.id ?? crypto.randomUUID(), model_id: item.model_id,
          productType: productTypeForModel(models, item.model_id), item_name: item.item_name ?? "", description: item.description ?? "",
          features: item.features ?? [], image_url: item.image_url, color_name: item.color_name ?? "", quantity: Number(item.quantity ?? 1),
          base_unit_price: Number(item.unit_price ?? 0) - savedAccessories.reduce((sum: number, accessory: QuotationAccessory) => sum + Number(accessory.unit_price || 0), 0),
          accessories,
        };
      }));
    })();
  }, [id, modelsLoaded]);

  const pricing = useMemo(() => computePricing({
    items: items.map((i) => ({ quantity: i.quantity, unit_price: i.base_unit_price + i.accessories.reduce((sum, accessory) => sum + accessory.unit_price, 0) })),
    gstEnabled, cgstPercentage: cgstPct, sgstPercentage: sgstPct, discountType, discountValue,
  }), [items, gstEnabled, cgstPct, sgstPct, discountType, discountValue]);

  const update = (key: string, patch: Partial<DraftItem>) =>
    setItems((arr) => arr.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const modelsFor = (productType: DraftItem["productType"]) => models.filter((model: any) => {
    const category = String(model.category ?? "").toLowerCase();
    if (productType === "pump") return category.includes("pump");
    if (productType === "membrane") return category.includes("membrane");
    return !category.includes("pump") && !category.includes("membrane") && !category.includes("cabinet");
  });

  const resetForm = () => {
    setName(""); setMobile(""); setEmail(""); setAddress(""); setGstNumber("");
    setCustomQuotationNumber("");
    setItems([blankItem("purifier")]); setGstEnabled(true); setCgstPct(9); setSgstPct(9);
    setDiscountType("percentage"); setDiscountValue(0); setValidityDays(7);
    setAccountNumber("45119431098"); setIfscCode("SBIN0001613");
    setBankName("STATE BANK OF INDIA"); setBankBranch("ADB PONDICHERRY");
    setAccountHolderName(ACCOUNT_HOLDER_NAME);
    toast.success("Form cleared");
  };

  const pickModel = (key: string, modelId: string) => {
    if (modelId === "__custom__") {
      update(key, { model_id: null, item_name: "", description: "", features: [], image_url: null, color_name: "", base_unit_price: 0, accessories: [] });
      return;
    }
    const m = models.find((x: any) => x.id === modelId);
    if (!m) return;
    update(key, {
      model_id: m.id, item_name: m.model_name, description: m.description ?? "",
      features: m.features ?? [], image_url: m.image_url ?? null, color_name: "", base_unit_price: Number(m.price),
    });
  };

  async function save(nextStatus: "draft" | "sent" | "approved") {
    if (!name.trim()) return toast.error("Customer name is required");
    if (items.length === 0 || items.every((i) => !i.item_name)) return toast.error("Add at least one item");
    setSaving(true);
    try {
      let customerId = id ? (await (supabase as any).from("quotations").select("customer_id").eq("id", id).single()).data?.customer_id : null;
      if (id && customerId) {
        const { error } = await supabase.from("customers").update({ name, mobile, email, address, gst_number: gstNumber || null }).eq("id", customerId);
        if (error) throw error;
      } else {
        const { data: cust, error: cErr } = await supabase.from("customers").insert([{ name, mobile, email, address, gst_number: gstNumber || null }]).select().single();
        if (cErr) throw cErr;
        customerId = cust.id;
      }
      const payload = {
        customer_id: customerId, subtotal: pricing.subtotal, gst_amount: pricing.gstAmount,
        cgst_percentage: cgstPct, sgst_percentage: sgstPct, cgst_amount: pricing.cgstAmount,
        sgst_amount: pricing.sgstAmount, gst_enabled: gstEnabled, discount_value: discountValue,
        discount_type: discountType, discount_amount: pricing.discountAmount,
        total_amount: pricing.total, status: id ? status : nextStatus, validity_days: validityDays,
        custom_quotation_number: customQuotationNumber || null, quotation_date: quotationDate || null,
        ...(customQuotationNumber.trim() ? { quotation_number: customQuotationNumber.trim() } : {}),
        buyer_gst_number: gstNumber || null, notes, terms,
        account_number: accountNumber || null, ifsc_code: ifscCode || null,
        account_holder_name: ACCOUNT_HOLDER_NAME,
        bank_name: bankName || null, bank_branch: bankBranch || null,
      };
      const { data: quote, error: qErr } = id
        ? await (supabase as any).from("quotations").update(payload).eq("id", id).select().single()
        : await supabase.from("quotations").insert([payload] as any).select().single();
      if (qErr) throw qErr;
      const lineItems = items.filter((i) => i.item_name).map((i, idx) => ({
        quotation_id: quote.id, model_id: i.model_id, item_name: i.item_name,
        description: i.description, features: i.features, image_url: i.image_url, color_name: i.color_name || null,
        accessories: i.accessories as unknown as Json,
        quantity: i.quantity, unit_price: i.base_unit_price + i.accessories.reduce((sum, accessory) => sum + accessory.unit_price, 0),
        total_price: Number(i.quantity) * (i.base_unit_price + i.accessories.reduce((sum, accessory) => sum + accessory.unit_price, 0)), position: idx,
      }));
      if (id) {
        const { error } = await (supabase as any).from("quotation_items").delete().eq("quotation_id", id);
        if (error) throw error;
      }
      const { error: iErr } = await supabase.from("quotation_items").insert(lineItems);
      if (iErr) throw iErr;
      toast.success(`Quotation ${quote.quotation_number} ${id ? "updated" : "saved"}`);
      navigate(`/quotations/${quote.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setSaving(false); }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">{id ? "Edit Quotation" : "New Quotation"}</h1>
          <p className="text-sm text-muted-foreground">{id ? "Update every quotation detail." : "Build a polished, branded quotation with live pricing."}</p>
        </header>
        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label>Company / Customer Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Mobile</Label><Input value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>GST Number</Label><Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>Address</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} /></div>
            <div className="space-y-1.5"><Label>Validity (days)</Label><Input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value) || 7)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Products & Items</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setItems((a) => [...a, blankItem()])}><Plus className="mr-1 h-4 w-4" /> Add Item</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.key} className="rounded-lg border bg-gradient-to-b from-card to-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item #{idx + 1}</div>
                  <Button size="sm" variant="ghost" onClick={() => setItems((a) => a.filter((x) => x.key !== item.key))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                  <div className="flex h-32 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                    {item.image_url ? <img src={item.image_url} alt={item.item_name} className="max-h-full max-w-full object-contain" /> : <div className="text-center text-xs text-muted-foreground"><Sparkles className="mx-auto mb-1 h-5 w-5" />No image</div>}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label>Choose purifier</Label>
                      <Select onValueChange={(v) => pickModel(item.key, v)} value={item.model_id ?? "__custom__"}>
                        <SelectTrigger><SelectValue placeholder="Select purifier from catalog..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__custom__">Custom item</SelectItem>
                          {modelsFor("purifier").map((m: any) => <SelectItem key={m.id} value={m.id}>{m.model_name} — {formatINR(Number(m.price))}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {item.model_id && (models.find((model: any) => model.id === item.model_id)?.color_variants?.length ?? 0) > 0 && <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                      <div>
                        <Label>Colour</Label>
                        <Select value={item.color_name || "__standard__"} onValueChange={(colorName) => {
                          const model = models.find((entry: any) => entry.id === item.model_id);
                          const variant = model?.color_variants?.find((entry: any) => entry.name === colorName);
                          update(item.key, { color_name: variant?.name ?? "", image_url: variant?.image_url ?? model?.image_url ?? null });
                        }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__standard__">Standard</SelectItem>
                            {models.find((model: any) => model.id === item.model_id)?.color_variants?.map((variant: any) => <SelectItem key={variant.id ?? variant.name} value={variant.name}>{variant.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {item.image_url && <img src={item.image_url} alt={item.color_name || item.item_name} className="h-14 w-16 rounded border object-contain" />}
                    </div>}
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Item name</Label><Input value={item.item_name} onChange={(e) => update(item.key, { item_name: e.target.value })} /></div>
                      <div><Label>Image URL</Label><Input value={item.image_url ?? ""} onChange={(e) => update(item.key, { image_url: e.target.value })} /></div>
                    </div>
                    <div><Label>Description</Label><Textarea rows={2} value={item.description} onChange={(e) => update(item.key, { description: e.target.value })} /></div>
                    {item.features.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.features.map((f, i) => <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>)}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Qty</Label><Input type="number" min={1} value={item.quantity} onChange={(e) => update(item.key, { quantity: Number(e.target.value) || 0 })} /></div>
                      <div><Label>{item.accessories.length ? "Purifier Price" : "Unit Price"}</Label><Input type="number" min={0} value={item.base_unit_price} onChange={(e) => update(item.key, { base_unit_price: Number(e.target.value) || 0 })} /></div>
                      <div><Label>Total (incl. selected parts)</Label><div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 font-mono text-sm font-semibold">{formatINR((item.quantity || 0) * (item.base_unit_price + item.accessories.reduce((sum, accessory) => sum + accessory.unit_price, 0)))}</div></div>
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
            <div><Label>Notes</Label><Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            <div><Label>Terms & Conditions</Label><Textarea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>Account Holder Name</Label><Input value={accountHolderName} readOnly /></div>
            <div><Label>Account Number</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
            <div><Label>IFSC Code</Label><Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} /></div>
            <div><Label>Bank Name</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Branch</Label><Input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} /></div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <Card className="border-2 border-primary/15 shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle className="text-base">Quotation & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-xs">Custom Quotation # (optional)</Label>
              <Input value={customQuotationNumber} onChange={(e) => setCustomQuotationNumber(e.target.value)} placeholder="e.g., SPAG-Q-0001 (auto-generated if left blank)" />
            </div>
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between"><Label className="m-0">Apply GST</Label><Switch checked={gstEnabled} onCheckedChange={setGstEnabled} /></div>
              <div className={gstEnabled ? "" : "pointer-events-none opacity-50"}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">CGST %</Label>
                    <Input type="number" min={0} max={100} step="0.01" value={cgstPct} onChange={(e) => setCgstPct(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">SGST %</Label>
                    <Input type="number" min={0} max={100} step="0.01" value={sgstPct} onChange={(e) => setSgstPct(Number(e.target.value) || 0)} />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <Label className="m-0">Discount</Label>
              <div className="flex gap-2">
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percentage">% Percent</SelectItem><SelectItem value="fixed">₹ Fixed</SelectItem></SelectContent>
                </Select>
                <Input type="number" min={0} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value) || 0)} />
              </div>
            </div>
            <div className="space-y-1.5 rounded-lg border bg-gradient-to-b from-background to-muted/40 p-4 font-mono text-sm">
              <Row label="Subtotal" value={formatINR(pricing.subtotal)} />
              {pricing.discountAmount > 0 && <Row label={`Discount`} value={`- ${formatINR(pricing.discountAmount)}`} />}
              {gstEnabled && <>
                <Row label={`CGST (${cgstPct}%)`} value={formatINR(pricing.cgstAmount)} />
                <Row label={`SGST (${sgstPct}%)`} value={formatINR(pricing.sgstAmount)} />
              </>
              }
              <div className="my-2 h-px bg-border" />
              <div className="flex items-center justify-between text-base"><span className="font-bold">Grand Total</span><span className="font-bold text-primary">{formatINR(pricing.total)}</span></div>
            </div>
            <div className="space-y-2">
              <Button className="w-full" size="lg" disabled={saving} onClick={() => save("sent")}><FileText className="mr-2 h-4 w-4" />{saving ? "Saving..." : id ? "Update & Generate" : "Save & Generate"}</Button>
              <Button className="w-full" variant="outline" disabled={saving} onClick={() => save("draft")}><Save className="mr-2 h-4 w-4" /> Save as Draft</Button>
              <Button className="w-full" variant="outline" disabled={saving} onClick={resetForm}>Clear Form</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span>{value}</span></div>;
}
