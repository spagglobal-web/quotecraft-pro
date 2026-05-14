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
import { Plus, Trash2, Save } from "lucide-react";
import { computePricing, formatINR, type DiscountType } from "@/lib/pricing";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/bills/new")({
  loader: async () => {
    const { data } = await supabase
      .from("purifier_models")
      .select("*")
      .eq("active", true)
      .order("model_name");
    return { models: data ?? [] };
  },
  component: NewBill,
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

function NewBill() {
  const { models } = Route.useLoaderData();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  const [items, setItems] = useState<DraftItem[]>([blankItem()]);

  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstPct, setGstPct] = useState(18);
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState(0);

  const [paymentTerms, setPaymentTerms] = useState("Payment due within 30 days of invoice date.");
  const [notes, setNotes] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankBranch, setBankBranch] = useState("");
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

  const resetForm = () => {
    setName("");
    setMobile("");
    setEmail("");
    setAddress("");
    setGstNumber("");
    setItems([blankItem()]);
    setGstEnabled(true);
    setGstPct(18);
    setDiscountType("percentage");
    setDiscountValue(0);
    setPaymentTerms("");
    setNotes("");
    setAccountNumber("");
    setIfscCode("");
    setBankName("");
    setBankBranch("");
    toast.success("Form cleared");
  };

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

  async function save() {
    if (!name.trim()) return toast.error("Customer name is required");
    if (items.length === 0 || items.every((i) => !i.item_name)) {
      return toast.error("Add at least one item");
    }
    setSaving(true);
    try {
      const { data: cust, error: cErr } = await supabase
        .from("customers")
        .insert([{ name, mobile, email, address, gst_number: gstNumber || null }])
        .select()
        .single();
      if (cErr) throw cErr;

      const { data: bill, error: bErr } = await supabase
        .from("bills")
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
          status: "draft",
          buyer_gst_number: gstNumber || null,
          notes,
          payment_terms: paymentTerms,
          account_number: accountNumber || null,
          ifsc_code: ifscCode || null,
          bank_name: bankName || null,
          bank_branch: bankBranch || null,
        }] as any)
        .select()
        .single();
      if (bErr) throw bErr;

      const lineItems = items
        .filter((i) => i.item_name)
        .map((i, idx) => ({
          bill_id: bill.id,
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
      const { error: iErr } = await supabase.from("bill_items").insert(lineItems);
      if (iErr) throw iErr;

      toast.success(`Bill ${bill.bill_number} saved`);
      navigate({ to: "/bills/$id", params: { id: bill.id } });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Failed to save bill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">New Bill</h1>
          <p className="text-sm text-muted-foreground">Create a new invoice/bill.</p>
        </header>

        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Company / Customer Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer Name" />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile Number</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>GST Number</Label>
              <Input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="e.g., 33AABCT1234H1Z0" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setItems([...items, blankItem()])}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.key} className="space-y-3 border-b pb-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline">Item {idx + 1}</Badge>
                  {items.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={() => setItems(items.filter((i) => i.key !== item.key))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Select from catalog or custom</Label>
                  <Select value={item.model_id || "__custom__"} onValueChange={(v) => pickModel(item.key, v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__custom__">Custom Item</SelectItem>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.model_name} ({formatINR(Number(m.price))})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Item Name *</Label>
                    <Input
                      value={item.item_name}
                      onChange={(e) => update(item.key, { item_name: e.target.value })}
                      placeholder="Product name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit Price (₹)</Label>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => update(item.key, { unit_price: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => update(item.key, { quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Total</Label>
                    <div className="pt-2 font-semibold">{formatINR(item.quantity * item.unit_price)}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => update(item.key, { description: e.target.value })}
                    placeholder="Product description"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pricing & Taxes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable GST</Label>
              <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
            </div>
            {gstEnabled && (
              <div className="space-y-1.5">
                <Label>GST Percentage</Label>
                <Input type="number" value={gstPct} onChange={(e) => setGstPct(Number(e.target.value))} />
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Discount Type</Label>
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as DiscountType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="amount">Flat Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Discount Value</Label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Additional Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Warranty</Label>
              <Textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Warranty details..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Bank Account Number</Label>
                <Input
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g., 1234567890"
                />
              </div>
              <div className="space-y-1.5">
                <Label>IFSC Code</Label>
                <Input
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  placeholder="e.g., HDFC0000001"
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., HDFC Bank"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bank Branch</Label>
                <Input
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  placeholder="e.g., Mumbai Main Branch"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatINR(pricing.subtotal)}</span>
            </div>
            {pricing.discountAmount > 0 && (
              <div className="flex justify-between text-destructive">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-semibold">− {formatINR(pricing.discountAmount)}</span>
              </div>
            )}
            {gstEnabled && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST ({gstPct}%)</span>
                <span className="font-semibold">{formatINR(pricing.gstAmount)}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatINR(pricing.total)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving} className="flex-1" size="lg">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Create Bill"}
          </Button>
          <Button onClick={resetForm} variant="outline" size="lg">
            Clear Form
          </Button>
        </div>
      </aside>
    </div>
  );
}
