import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { computePricing, formatINR, type DiscountType } from "@/lib/pricing";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface DraftItem {
  key: string; model_id: string | null; item_name: string; description: string;
  features: string[]; image_url: string | null; quantity: number; unit_price: number;
}
const blankItem = (): DraftItem => ({
  key: crypto.randomUUID(), model_id: null, item_name: "", description: "",
  features: [], image_url: null, quantity: 1, unit_price: 0,
});

export default function BillNew() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [models, setModels] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("purifier_models").select("*").eq("active", true).order("model_name");
      setModels(data ?? []);
    })();
  }, []);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [customBillNumber, setCustomBillNumber] = useState("");
  const [items, setItems] = useState<DraftItem[]>([blankItem()]);
  const [gstEnabled, setGstEnabled] = useState(true);
  const [cgstPct, setCgstPct] = useState(9);
  const [sgstPct, setSgstPct] = useState(9);
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("Payment due within 30 days of invoice date.");
  const [notes, setNotes] = useState("");
  const [accountNumber, setAccountNumber] = useState("45119431098");
  const [ifscCode, setIfscCode] = useState("SBIN0001613");
  const [bankName, setBankName] = useState("STATE BANK OF INDIA");
  const [bankBranch, setBankBranch] = useState("ADB PONDICHERRY");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: bill, error } = await (supabase as any).from("bills").select("*, customers(*), bill_items(*)").eq("id", id).single();
      if (error || !bill) return toast.error(error?.message ?? "Bill not found");
      const customer = bill.customers ?? {};
      setName(customer.name ?? ""); setMobile(customer.mobile ?? ""); setEmail(customer.email ?? "");
      setAddress(customer.address ?? ""); setGstNumber(bill.buyer_gst_number ?? customer.gst_number ?? "");
      setCustomBillNumber(bill.custom_bill_number ?? ""); setBillDate((bill.bill_date ?? bill.created_at ?? "").slice(0, 10));
      setStatus(bill.status ?? "draft");
      setGstEnabled(Boolean(bill.gst_enabled)); setCgstPct(Number(bill.cgst_percentage ?? 9)); setSgstPct(Number(bill.sgst_percentage ?? 9));
      setDiscountType((bill.discount_type ?? "percentage") as DiscountType); setDiscountValue(Number(bill.discount_value ?? 0));
      setPaymentTerms(bill.payment_terms ?? ""); setNotes(bill.notes ?? ""); setAccountNumber(bill.account_number ?? "");
      setIfscCode(bill.ifsc_code ?? ""); setBankName(bill.bank_name ?? ""); setBankBranch(bill.bank_branch ?? "");
      setAccountHolderName(bill.account_holder_name ?? "");
      setItems((bill.bill_items ?? []).sort((a: any, b: any) => a.position - b.position).map((item: any) => ({
        key: item.id ?? crypto.randomUUID(), model_id: item.model_id, item_name: item.item_name ?? "", description: item.description ?? "",
        features: item.features ?? [], image_url: item.image_url, quantity: Number(item.quantity ?? 1), unit_price: Number(item.unit_price ?? 0),
      })));
    })();
  }, [id]);

  const pricing = useMemo(() => computePricing({
    items: items.map((i) => ({ quantity: i.quantity, unit_price: i.unit_price })),
    gstEnabled, cgstPercentage: cgstPct, sgstPercentage: sgstPct, discountType, discountValue,
  }), [items, gstEnabled, cgstPct, sgstPct, discountType, discountValue]);

  const update = (key: string, patch: Partial<DraftItem>) =>
    setItems((arr) => arr.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const pickModel = (key: string, modelId: string) => {
    if (modelId === "__custom__") {
      update(key, { model_id: null, item_name: "", description: "", features: [], image_url: null, unit_price: 0 });
      return;
    }
    const m = models.find((x: any) => x.id === modelId);
    if (!m) return;
    update(key, {
      model_id: m.id, item_name: m.model_name, description: m.description ?? "",
      features: m.features ?? [], image_url: m.image_url ?? null, unit_price: Number(m.price),
    });
  };

  async function save() {
    if (!name.trim()) return toast.error("Customer name is required");
    if (items.length === 0 || items.every((i) => !i.item_name)) return toast.error("Add at least one item");
    setSaving(true);
    try {
      let customerId = id ? (await (supabase as any).from("bills").select("customer_id").eq("id", id).single()).data?.customer_id : null;
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
        total_amount: pricing.total, status,
        custom_bill_number: customBillNumber || null, bill_date: billDate || null,
        buyer_gst_number: gstNumber || null, notes, payment_terms: paymentTerms,
        account_number: accountNumber || null, ifsc_code: ifscCode || null,
        account_holder_name: accountHolderName || null,
        bank_name: bankName || null, bank_branch: bankBranch || null,
      };
      const { data: bill, error: bErr } = id
        ? await (supabase as any).from("bills").update(payload).eq("id", id).select().single()
        : await (supabase as any).from("bills").insert([payload]).select().single();
      if (bErr) throw bErr;
      const lineItems = items.filter((i) => i.item_name).map((i, idx) => ({
        bill_id: bill.id, model_id: i.model_id, item_name: i.item_name,
        description: i.description, features: i.features, image_url: i.image_url,
        quantity: i.quantity, unit_price: i.unit_price,
        total_price: Number(i.quantity) * Number(i.unit_price), position: idx,
      }));
      if (id) {
        const { error } = await (supabase as any).from("bill_items").delete().eq("bill_id", id);
        if (error) throw error;
      }
      const { error: iErr } = await (supabase as any).from("bill_items").insert(lineItems);
      if (iErr) throw iErr;
      toast.success(`Bill ${bill.bill_number} ${id ? "updated" : "saved"}`);
      navigate(`/bills/${bill.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setSaving(false); }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <header><h1 className="text-3xl font-bold tracking-tight">{id ? "Edit Bill" : "New Bill"}</h1><p className="text-sm text-muted-foreground">{id ? "Update every invoice detail." : "Create a new invoice/bill."}</p></header>

        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Mobile</Label><Input value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>GST Number</Label><Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} /></div>
            <div className="md:col-span-2"><Label>Address</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setItems([...items, blankItem()])}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.key} className="space-y-3 border-b pb-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline">Item {idx + 1}</Badge>
                  {items.length > 1 && <Button size="sm" variant="ghost" onClick={() => setItems(items.filter((i) => i.key !== item.key))}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
                <div><Label>Catalog</Label>
                  <Select value={item.model_id || "__custom__"} onValueChange={(v) => pickModel(item.key, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__custom__">Custom Item</SelectItem>
                      {models.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.model_name} ({formatINR(Number(m.price))})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div><Label>Name *</Label><Input value={item.item_name} onChange={(e) => update(item.key, { item_name: e.target.value })} /></div>
                  <div><Label>Unit Price</Label><Input type="number" value={item.unit_price} onChange={(e) => update(item.key, { unit_price: Number(e.target.value) })} /></div>
                  <div><Label>Qty</Label><Input type="number" min="1" value={item.quantity} onChange={(e) => update(item.key, { quantity: Number(e.target.value) })} /></div>
                  <div><Label>Total</Label><div className="pt-2 font-semibold">{formatINR(item.quantity * item.unit_price)}</div></div>
                </div>
                <div><Label>Description</Label><Textarea value={item.description} onChange={(e) => update(item.key, { description: e.target.value })} rows={2} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Invoice & Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Custom Bill Number (optional)</Label><Input value={customBillNumber} onChange={(e) => setCustomBillNumber(e.target.value)} placeholder="e.g., SPAG-B-0001 (leave blank for auto)" /></div>
              <div><Label>Bill Date</Label><Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></div>
            </div>
            <div className="flex items-center justify-between"><Label>Enable GST</Label><Switch checked={gstEnabled} onCheckedChange={setGstEnabled} /></div>
            {gstEnabled && <div className="grid gap-3 md:grid-cols-2">
              <div><Label>CGST %</Label><Input type="number" step="0.01" value={cgstPct} onChange={(e) => setCgstPct(Number(e.target.value))} /></div>
              <div><Label>SGST %</Label><Input type="number" step="0.01" value={sgstPct} onChange={(e) => setSgstPct(Number(e.target.value))} /></div>
            </div>}
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Discount Type</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Flat (₹)</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Discount Value</Label><Input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Additional Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Warranty / Payment Terms</Label><Textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} rows={3} /></div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Account Holder Name</Label><Input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} /></div>
              <div><Label>Account Number</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
              <div><Label>IFSC Code</Label><Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} /></div>
              <div><Label>Bank Name</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
              <div className="md:col-span-2"><Label>Branch</Label><Input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{formatINR(pricing.subtotal)}</span></div>
            {pricing.discountAmount > 0 && <div className="flex justify-between text-destructive"><span>Discount</span><span>− {formatINR(pricing.discountAmount)}</span></div>}
            {gstEnabled && <>
              <div className="flex justify-between"><span className="text-muted-foreground">CGST ({cgstPct}%)</span><span>{formatINR(pricing.cgstAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SGST ({sgstPct}%)</span><span>{formatINR(pricing.sgstAmount)}</span></div>
            </>}
            <div className="border-t pt-3 flex justify-between text-lg font-bold"><span>Total</span><span>{formatINR(pricing.total)}</span></div>
          </CardContent>
        </Card>
        <Button onClick={save} disabled={saving} className="w-full" size="lg"><Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : id ? "Update Bill" : "Create Bill"}</Button>
      </aside>
    </div>
  );
}
