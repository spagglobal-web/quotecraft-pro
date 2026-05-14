import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/pricing";
import { loadCompany } from "@/lib/company";
import { ArrowLeft, Copy, Printer, Trash2, CheckCircle2, Send, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function BillView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const company = loadCompany();

  async function load() {
    const { data: b } = await (supabase as any).from("bills").select("*, customers(*), bill_items(*)").eq("id", id!).single();
    setData(b);
  }
  useEffect(() => { if (id) load(); }, [id]);
  if (!data) return <div className="p-8 text-center">Loading...</div>;

  const bill = data;
  const items = (bill.bill_items ?? []).sort((a: any, b: any) => a.position - b.position);
  const c = bill.customers;
  const created = new Date(bill.created_at);

  async function setStatus(s: string) {
    const { error } = await (supabase as any).from("bills").update({ status: s }).eq("id", bill.id);
    if (error) return toast.error(error.message);
    toast.success(`Status updated`);
    load();
  }

  async function duplicate() {
    const { data: nb, error } = await (supabase as any).from("bills").insert([{
      customer_id: bill.customer_id, subtotal: bill.subtotal, gst_amount: bill.gst_amount,
      gst_percentage: bill.gst_percentage, gst_enabled: bill.gst_enabled,
      discount_value: bill.discount_value, discount_type: bill.discount_type,
      discount_amount: bill.discount_amount, total_amount: bill.total_amount,
      status: "draft", buyer_gst_number: bill.buyer_gst_number, notes: bill.notes,
      payment_terms: bill.payment_terms, account_number: bill.account_number,
      ifsc_code: bill.ifsc_code, bank_name: bill.bank_name, bank_branch: bill.bank_branch,
    }]).select().single();
    if (error || !nb) return toast.error(error?.message ?? "Failed");
    await (supabase as any).from("bill_items").insert(items.map((i: any) => ({
      bill_id: nb.id, model_id: i.model_id, item_name: i.item_name,
      description: i.description, features: i.features, image_url: i.image_url,
      quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price, position: i.position,
    })));
    toast.success(`Duplicated as ${nb.bill_number}`);
    navigate(`/bills/${nb.id}`);
  }

  async function remove() {
    if (!confirm("Delete this bill?")) return;
    const { error } = await (supabase as any).from("bills").delete().eq("id", bill.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate("/bills");
  }

  const statusMeta: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    draft: { label: "Draft", color: "#b45309", bg: "rgba(254,243,199,0.9)", border: "#fde68a", icon: <FileText size={13} /> },
    issued: { label: "Issued", color: "#1e40af", bg: "rgba(219,234,254,0.9)", border: "#93c5fd", icon: <Send size={13} /> },
    paid: { label: "Paid", color: "#065f46", bg: "rgba(209,250,229,0.9)", border: "#6ee7b7", icon: <CheckCircle2 size={13} /> },
  };
  const sm = statusMeta[bill.status] ?? statusMeta.draft;

  return (
    <>
      <style>{`
        .bv-doc { background: white; border: 1px solid #ddd; }
        .bv-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border-radius: 4px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid #ddd; background: white; text-decoration: none; color: #333; }
        .bv-btn-primary { background: #007bff; color: white; border-color: #007bff; }
        .bv-btn-danger { color: #dc3545; border-color: transparent; }
        @media print { .no-print { display: none !important; } .bv-doc { border: none; } @page { size: A4; margin: 0; } html, body { margin:0; background: white; } }
      `}</style>
      <div style={{ maxWidth: "210mm", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
        <div className="no-print" style={{ display: "flex", gap: 8, padding: 12, background: "#f5f5f5", borderRadius: 6, marginBottom: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link to="/bills" className="bv-btn"><ArrowLeft size={16} /> All Bills</Link>
            <div style={{ padding: "5px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: sm.color, background: sm.bg, border: "1px solid " + sm.border }}>{sm.icon} {sm.label}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Select value={bill.status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <button className="bv-btn" onClick={duplicate}><Copy size={15} /> Duplicate</button>
            <button className="bv-btn bv-btn-primary" onClick={() => window.print()}><Printer size={15} /> Download PDF</button>
            <button className="bv-btn bv-btn-danger" onClick={remove}><Trash2 size={16} /></button>
          </div>
        </div>

        <div className="bv-doc">
          <div style={{ padding: "20px 25px", borderBottom: "2px solid #333", display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 22 }}>{company.name}</div>
              {company.address && <div style={{ fontSize: 11 }}>{company.address}</div>}
              {company.phone && <div style={{ fontSize: 11 }}>{company.phone}{company.email && ` • ${company.email}`}</div>}
              {company.gst_number && <div style={{ fontSize: 11, marginTop: 4 }}>GST: {company.gst_number}</div>}
            </div>
            {company.logo_url && <img src={company.logo_url} alt="logo" style={{ maxWidth: 120, maxHeight: 120, objectFit: "contain" }} />}
          </div>

          <div style={{ padding: "12px 20px" }}>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>INVOICE</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 15 }}>
              <div style={{ background: "#fafafa", border: "1px solid #eee", padding: 10, borderRadius: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase" }}>Invoice No.</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{bill.bill_number}</div>
              </div>
              <div style={{ background: "#fafafa", border: "1px solid #eee", padding: 10, borderRadius: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase" }}>Date</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{created.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
              </div>
              <div style={{ background: "#fafafa", border: "1px solid #eee", padding: 10, borderRadius: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase" }}>Status</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: sm.color }}>{sm.label}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: "20px 25px" }}>
            <div style={{ marginBottom: 15 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", marginBottom: 5 }}>Bill To</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{c?.name ?? "—"}</div>
              {c?.address && <div style={{ fontSize: 12, color: "#333" }}>{c.address}</div>}
              {c?.mobile && <div style={{ fontSize: 12, color: "#333" }}>📱 {c.mobile}</div>}
              {c?.email && <div style={{ fontSize: 12, color: "#333" }}>📧 {c.email}</div>}
              {(bill.buyer_gst_number || c?.gst_number) && <div style={{ fontSize: 12 }}>GST: {bill.buyer_gst_number || c?.gst_number}</div>}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ padding: "6px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", borderBottom: "2px solid #333", background: "#fafafa" }}>Item</th>
                  <th style={{ padding: "6px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, textTransform: "uppercase", borderBottom: "2px solid #333", background: "#fafafa", width: 60 }}>Qty</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, textTransform: "uppercase", borderBottom: "2px solid #333", background: "#fafafa", width: 100 }}>Unit Price</th>
                  <th style={{ padding: "6px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, textTransform: "uppercase", borderBottom: "2px solid #333", background: "#fafafa", width: 100 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any) => (
                  <tr key={it.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "10px 8px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", gap: 10 }}>
                        {it.image_url && <img src={it.image_url} alt={it.item_name} style={{ width: 70, height: 70, objectFit: "contain", border: "1px solid #ddd", borderRadius: 4, padding: 3 }} />}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{it.item_name}</div>
                          {it.description && <div style={{ fontSize: 12, color: "#666" }}>{it.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "center", fontWeight: 700 }}>{it.quantity}</td>
                    <td style={{ padding: "10px 8px", textAlign: "right" }}>{formatINR(Number(it.unit_price))}</td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700 }}>{formatINR(Number(it.total_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 20, marginTop: 15, paddingTop: 15, borderTop: "2px solid #333" }}>
              <div>
                {bill.notes && <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Notes</div><div style={{ fontSize: 11 }}>{bill.notes}</div></div>}
                {bill.payment_terms && <div style={{ background: "#fff3cd", padding: 10, borderRadius: 4, marginBottom: 10 }}><div style={{ fontSize: 11, fontWeight: 700, color: "#856404" }}>WARRANTY / TERMS</div><div style={{ fontSize: 11 }}>{bill.payment_terms}</div></div>}
                {(bill.account_number || bill.bank_name) && <div><div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Bank Details</div><div style={{ fontSize: 11 }}>
                  {bill.account_number && <div>Account: {bill.account_number}</div>}
                  {bill.ifsc_code && <div>IFSC: {bill.ifsc_code}</div>}
                  {bill.bank_name && <div>Bank: {bill.bank_name}</div>}
                  {bill.bank_branch && <div>Branch: {bill.bank_branch}</div>}
                </div></div>}
              </div>
              <div style={{ background: "#fafafa", border: "1px solid #ddd", borderRadius: 4, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 12 }}><span style={{ color: "#666" }}>Subtotal</span><span style={{ fontWeight: 700 }}>{formatINR(Number(bill.subtotal))}</span></div>
                {Number(bill.discount_amount) > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 12 }}><span style={{ color: "#666" }}>Discount</span><span style={{ fontWeight: 700 }}>− {formatINR(Number(bill.discount_amount))}</span></div>}
                {bill.gst_enabled && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 12 }}><span style={{ color: "#666" }}>GST ({bill.gst_percentage}%)</span><span style={{ fontWeight: 700 }}>{formatINR(Number(bill.gst_amount))}</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "2px solid #333", fontSize: 14, fontWeight: 700 }}><span>Total</span><span>{formatINR(Number(bill.total_amount))}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
