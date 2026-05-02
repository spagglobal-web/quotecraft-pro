import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/pricing";
import { loadCompany } from "@/lib/company";
import { ArrowLeft, Copy, Printer, Trash2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/quotations/$id")({
  loader: async ({ params }) => {
    const { data: q } = await supabase
      .from("quotations")
      .select("*, customers(*), quotation_items(*)")
      .eq("id", params.id)
      .single();
    if (!q) throw new Error("Quotation not found");
    const items = (q.quotation_items ?? []).sort((a: any, b: any) => a.position - b.position);
    return { quotation: q, items, company: loadCompany() };
  },
  component: ViewQuotation,
});

function ViewQuotation() {
  const { quotation, items, company } = Route.useLoaderData();
  const navigate = useNavigate();
  const c = quotation.customers as any;

  const created = new Date(quotation.created_at);
  const validUntil = new Date(created);
  validUntil.setDate(validUntil.getDate() + (quotation.validity_days ?? 7));

  async function setStatus(s: string) {
    const { error } = await supabase
      .from("quotations")
      .update({ status: s as "draft" | "sent" | "approved" })
      .eq("id", quotation.id);
    if (error) return toast.error(error.message);
    toast.success(`Marked as ${s}`);
    navigate({ to: "/quotations/$id", params: { id: quotation.id } });
  }

  async function duplicate() {
    const { data: nq, error } = await supabase
      .from("quotations")
      .insert([{
        customer_id: quotation.customer_id,
        subtotal: quotation.subtotal,
        gst_amount: quotation.gst_amount,
        gst_percentage: quotation.gst_percentage,
        gst_enabled: quotation.gst_enabled,
        discount_value: quotation.discount_value,
        discount_type: quotation.discount_type,
        discount_amount: quotation.discount_amount,
        total_amount: quotation.total_amount,
        status: "draft",
        validity_days: quotation.validity_days,
        notes: quotation.notes,
        terms: quotation.terms,
      }] as any)
      .select()
      .single();
    if (error || !nq) return toast.error(error?.message ?? "Failed");
    await supabase.from("quotation_items").insert(
      items.map((i: any) => ({
        quotation_id: nq.id,
        model_id: i.model_id,
        item_name: i.item_name,
        description: i.description,
        features: i.features,
        image_url: i.image_url,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
        position: i.position,
      })),
    );
    toast.success(`Duplicated as ${nq.quotation_number}`);
    navigate({ to: "/quotations/$id", params: { id: nq.id } });
  }

  async function remove() {
    if (!confirm("Delete this quotation?")) return;
    const { error } = await supabase.from("quotations").delete().eq("id", quotation.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/quotations" });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Toolbar (hidden in print) */}
      <div className="no-print flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link to="/quotations"><ArrowLeft className="mr-1 h-4 w-4" /> All quotations</Link>
          </Button>
          <Badge variant="secondary">{quotation.status}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={quotation.status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={duplicate}><Copy className="mr-1 h-4 w-4" /> Duplicate</Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" /> Download PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={remove}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>

      {/* Printable document */}
      <Card className="print-page overflow-hidden border-2 shadow-[var(--shadow-elegant)]">
        <CardContent className="p-0">
          {/* Header band */}
          <div className="relative bg-gradient-to-br from-primary via-primary to-primary-glow px-8 py-7 text-primary-foreground">
            <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white p-2 shadow-md">
                <img src={company.logo_url} alt={company.name} className="max-h-full max-w-full object-contain" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] opacity-80">
                  {company.tagline}
                </div>
                <h1 className="mt-1 text-2xl font-extrabold leading-tight md:text-3xl">{company.name}</h1>
                <div className="mt-2 text-xs leading-relaxed opacity-90">
                  {company.address}<br />
                  📞 {company.phone} &nbsp;·&nbsp; ✉️ {company.email} &nbsp;·&nbsp; 🌐 {company.website}
                </div>
              </div>
              <div className="rounded-xl bg-white/15 px-5 py-3 text-right backdrop-blur md:min-w-[180px]">
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Quotation</div>
                <div className="font-mono text-lg font-bold">{quotation.quotation_number}</div>
              </div>
            </div>
          </div>

          {/* Meta bar */}
          <div className="grid gap-4 border-b bg-muted/30 px-8 py-5 md:grid-cols-3">
            <Meta label="Quotation Date" value={created.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
            <Meta label="Valid Until" value={validUntil.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
            <Meta label="Status" value={quotation.status.toUpperCase()} />
          </div>

          {/* Bill to */}
          <div className="border-b px-8 py-5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quotation For</div>
            <div className="mt-1 text-lg font-bold">{c?.name ?? "—"}</div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {c?.address}{c?.address && (c?.mobile || c?.email) && " · "}
              {c?.mobile}{c?.mobile && c?.email && " · "}{c?.email}
            </div>
          </div>

          {/* Items */}
          <div className="overflow-x-auto px-2 md:px-8 py-5">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider">#</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider">Item</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider">Qty</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider">Unit Price</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, idx: number) => (
                  <tr key={it.id} className="border-b align-top">
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{String(idx + 1).padStart(2, "0")}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-3">
                        {it.image_url ? (
                          <img src={it.image_url} alt={it.item_name} className="h-14 w-14 rounded border bg-white object-contain p-1" />
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded border bg-gradient-to-br from-muted to-accent" />
                        )}
                        <div className="min-w-0">
                          <div className="font-bold">{it.item_name}</div>
                          {it.description && <div className="text-xs text-muted-foreground">{it.description}</div>}
                          {it.features?.length > 0 && (
                            <ul className="mt-1 grid grid-cols-1 gap-x-3 text-[11px] text-muted-foreground sm:grid-cols-2">
                              {it.features.map((f: string, i: number) => (
                                <li key={i}>• {f}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-medium">{it.quantity}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatINR(Number(it.unit_price))}</td>
                    <td className="px-3 py-3 text-right font-mono font-semibold">{formatINR(Number(it.total_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="grid gap-6 border-t bg-muted/20 px-8 py-6 md:grid-cols-[1fr_320px]">
            <div className="space-y-3 text-sm">
              {quotation.notes && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Notes</div>
                  <div className="whitespace-pre-line text-foreground">{quotation.notes}</div>
                </div>
              )}
              {quotation.terms && (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Terms & Conditions</div>
                  <div className="whitespace-pre-line text-xs text-muted-foreground">{quotation.terms}</div>
                </div>
              )}
            </div>
            <div className="space-y-2 rounded-lg border bg-card p-4 font-mono text-sm">
              <RowT label="Subtotal" value={formatINR(Number(quotation.subtotal))} />
              {Number(quotation.discount_amount) > 0 && (
                <RowT
                  label={`Discount (${quotation.discount_type === "percentage" ? `${quotation.discount_value}%` : "₹"})`}
                  value={`- ${formatINR(Number(quotation.discount_amount))}`}
                />
              )}
              {quotation.gst_enabled && (
                <RowT label={`GST (${quotation.gst_percentage}%)`} value={formatINR(Number(quotation.gst_amount))} />
              )}
              <div className="my-2 h-px bg-border" />
              <div className="flex items-center justify-between rounded-md bg-gradient-to-r from-primary to-primary-glow px-3 py-2 text-primary-foreground">
                <span className="font-bold">Grand Total</span>
                <span className="text-base font-extrabold">{formatINR(Number(quotation.total_amount))}</span>
              </div>
            </div>
          </div>

          {/* Footer / signature */}
          <div className="grid gap-4 border-t px-8 py-6 text-xs md:grid-cols-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Thank you</div>
              <div className="mt-1">We appreciate your business. For queries, contact {company.phone}.</div>
            </div>
            <div className="md:text-right">
              <div className="ml-auto h-12 w-48 border-b border-dashed md:ml-auto" />
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Authorised Signatory · {company.name}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
function RowT({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
