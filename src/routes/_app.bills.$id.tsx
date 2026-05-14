import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/pricing";
import { loadCompany } from "@/lib/company";
import { ArrowLeft, Copy, Printer, Trash2, CheckCircle2, Send, FileText } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/bills/$id")({
  loader: async ({ params }) => {
    const { data: b } = await supabase
      .from("bills")
      .select("*, customers(*), bill_items(*)")
      .eq("id", params.id)
      .single();
    if (!b) throw new Error("Bill not found");
    const items = (b.bill_items ?? []).sort((a: any, b: any) => a.position - b.position);
    return { bill: b, items, company: loadCompany() };
  },
  component: ViewBill,
});

function ViewBill() {
  const { bill, items, company } = Route.useLoaderData();
  const navigate = useNavigate();
  const c = bill.customers as any;

  const created = new Date(bill.created_at);

  async function setStatus(s: string) {
    const { error } = await supabase
      .from("bills")
      .update({ status: s as "draft" | "issued" | "paid" })
      .eq("id", bill.id);
    if (error) return toast.error(error.message);
    toast.success(`Status updated to ${s}`);
    navigate({ to: "/bills/$id", params: { id: bill.id } });
  }

  async function duplicate() {
    const { data: nb, error } = await supabase
      .from("bills")
      .insert([{
        customer_id: bill.customer_id,
        subtotal: bill.subtotal,
        gst_amount: bill.gst_amount,
        gst_percentage: bill.gst_percentage,
        gst_enabled: bill.gst_enabled,
        discount_value: bill.discount_value,
        discount_type: bill.discount_type,
        discount_amount: bill.discount_amount,
        total_amount: bill.total_amount,
        status: "draft",
        buyer_gst_number: bill.buyer_gst_number,
        notes: bill.notes,
        payment_terms: bill.payment_terms,
        account_number: bill.account_number,
        ifsc_code: bill.ifsc_code,
        bank_name: bill.bank_name,
        bank_branch: bill.bank_branch,
      }] as any)
      .select()
      .single();
    if (error || !nb) return toast.error(error?.message ?? "Failed");
    await supabase.from("bill_items").insert(
      items.map((i: any) => ({
        bill_id: nb.id,
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
    toast.success(`Duplicated as ${nb.bill_number}`);
    navigate({ to: "/bills/$id", params: { id: nb.id } });
  }

  async function remove() {
    if (!confirm("Delete this bill?")) return;
    const { error } = await supabase.from("bills").delete().eq("id", bill.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/bills" });
  }

  const statusMeta: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    draft:   { label: "Draft",   color: "#b45309", bg: "rgba(254,243,199,0.9)", border: "#fde68a", icon: <FileText size={13} /> },
    issued:  { label: "Issued",  color: "#1e40af", bg: "rgba(219,234,254,0.9)", border: "#93c5fd", icon: <Send size={13} /> },
    paid:    { label: "Paid",    color: "#065f46", bg: "rgba(209,250,229,0.9)", border: "#6ee7b7", icon: <CheckCircle2 size={13} /> },
  };
  const sm = statusMeta[bill.status] ?? statusMeta.draft;

  return (
    <>
      <style>{`
        .bill-root { font-family: Arial, sans-serif; width: 210mm; height: 297mm; margin: 0 auto; background: white; }
        
        .bill-toolbar {
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .bill-btn-ghost, .bill-btn-outline, .bill-btn-primary, .bill-btn-danger {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 16px; border-radius: 4px;
          font-size: 14px; font-weight: 600;
          cursor: pointer; border: 1px solid #ddd;
          background: white; color: #333;
          transition: all 0.2s; text-decoration: none;
        }
        .bill-btn-ghost:hover { background: #f0f0f0; }
        .bill-btn-outline:hover { background: #f0f0f0; border-color: #999; }
        .bill-btn-primary {
          background: #007bff; color: white; border-color: #007bff;
        }
        .bill-btn-primary:hover { background: #0056b3; border-color: #0056b3; }
        .bill-btn-danger {
          color: #dc3545;
        }
        .bill-btn-danger:hover { background: #fff5f5; border-color: #dc3545; }

        .bill-document {
          background: white;
          border: 1px solid #ddd;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .bill-header {
          background: white;
          padding: 20px 25px;
          border-bottom: 2px solid #333;
        }

        .bill-company-name {
          font-weight: bold;
          font-size: 22px;
          color: #000;
          margin-bottom: 3px;
        }

        .bill-title {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          margin-bottom: 15px;
        }

        .bill-meta-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 8px;
        }

        .bill-meta-item {
          background: #fafafa;
          border: 1px solid #eee;
          border-radius: 4px;
          padding: 10px;
        }

        .bill-meta-label {
          font-size: 10px;
          font-weight: bold;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 3px;
        }

        .bill-meta-value {
          font-size: 15px;
          font-weight: bold;
          color: #000;
        }

        .bill-body {
          background: white;
          padding: 20px 25px;
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .bill-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .bill-th {
          padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold;
          letter-spacing: 0.05em; text-transform: uppercase; color: #333;
          border-bottom: 2px solid #333; background: #fafafa;
        }
        .bill-th:last-child { text-align: right; }

        .bill-item-row {
          border-bottom: 1px solid #eee; vertical-align: top;
        }
        .bill-item-row td { padding: 10px 8px; }

        .bill-item-name {
          font-size: 13px;
          font-weight: bold;
          color: #000;
          margin-bottom: 2px;
        }
        .bill-item-desc {
          font-size: 12px;
          color: #666;
          line-height: 1.3;
        }

        .bill-item-image {
          width: 70px;
          height: 70px;
          object-fit: contain;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 3px;
          background: #fafafa;
          margin-right: 10px;
          flex-shrink: 0;
        }

        .bill-item-cell {
          display: flex;
          align-items: flex-start;
          gap: 0;
        }

        .bill-item-details {
          flex: 1;
        }

        .bill-qty-cell {
          text-align: center; font-weight: bold; font-size: 12px;
        }

        .bill-price-cell {
          text-align: right; font-size: 12px; font-weight: 600; color: #333;
        }

        .bill-total-cell {
          text-align: right; font-size: 12px; font-weight: bold; color: #000;
        }

        .bill-summary {
          display: grid; grid-template-columns: 1fr 190px; gap: 20px;
          padding: 15px 0; border-top: 2px solid #333;
          margin-top: 15px;
        }

        .bill-summary-box {
          background: #fafafa; border: 1px solid #ddd; border-radius: 4px; padding: 12px;
          color: #000; margin-left: auto;
        }

        .bill-sum-row {
          display: flex; justify-content: space-between; margin-bottom: 7px;
          font-size: 12px;
        }

        .bill-sum-label { color: #666; font-weight: 600; }
        .bill-sum-value { font-weight: bold; color: #000; }

        .bill-grand-total {
          display: flex; justify-content: space-between;
          padding-top: 8px; border-top: 2px solid #333;
          font-size: 14px; font-weight: bold; color: #000;
        }

        .bill-footer {
          background: #fafafa; padding: 15px 25px; color: #666;
          font-size: 12px; line-height: 1.5; border-top: 1px solid #ddd;
        }

        .bill-notes-section {
          margin-bottom: 10px;
        }

        .bill-notes-label {
          font-weight: bold; color: #000; margin-bottom: 3px; font-size: 11px;
          letter-spacing: 0.05em; text-transform: uppercase;
        }

        .bill-notes-text {
          white-space: pre-line; color: #333; font-size: 11px;
          line-height: 1.4;
        }}

        .bill-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border: 1px solid;
        }

        @media print {
          html, body { margin: 0; padding: 0; background: white !important; width: 210mm; height: 297mm; }
          .no-print { display: none !important; }
          .bill-document { box-shadow: none !important; border: none !important; margin: 0 !important; border-radius: 0 !important; width: 210mm !important; height: 297mm !important; }
          .bill-root { max-width: 210mm !important; width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; }
          @page { size: A4; margin: 0; padding: 0; }
        }
      `}</style>

      <div className="bill-root">
        <div className="no-print bill-toolbar flex flex-col gap-3 md:flex-row md:items-center md:justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/bills" className="bill-btn-ghost">
              <ArrowLeft size={17} /> All Bills
            </Link>
            <div className="bill-status-pill" style={{ color: sm.color, background: sm.bg, borderColor: sm.border }}>
              {sm.icon}
              {sm.label}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={bill.status} onValueChange={setStatus}>
              <SelectTrigger className="w-[150px] text-base font-semibold border-blue-800 bg-blue-950 text-blue-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <button className="bill-btn-outline" onClick={duplicate}>
              <Copy size={16} /> Duplicate
            </button>
            <button className="bill-btn-primary" onClick={() => window.print()}>
              <Printer size={16} /> Download PDF
            </button>
            <button className="bill-btn-danger" onClick={remove}>
              <Trash2 size={17} />
            </button>
          </div>
        </div>

        <div className="bill-document">
          <div className="bill-header">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div>
                <div className="bill-company-name">{company.name}</div>
                {company.address && <div style={{ fontSize: "11px", marginBottom: "2px", color: "#333" }}>{company.address}</div>}
                {company.phone && <div style={{ fontSize: "11px", color: "#333" }}>{company.phone}{company.email ? ` • ${company.email}` : ""}</div>}
              </div>
              {company.logo_url && (
                <div style={{ width: "120px", height: "120px", flexShrink: 0 }}>
                  <img src={company.logo_url} alt={company.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </div>
              )}
            </div>
          </div>

          <div style={{ background: "white", padding: "12px 20px" }}>
            <div className="bill-title">INVOICE</div>
            <div className="bill-meta-row">
              <div className="bill-meta-item">
                <div className="bill-meta-label">Invoice No.</div>
                <div className="bill-meta-value">{bill.bill_number}</div>
              </div>
              <div className="bill-meta-item">
                <div className="bill-meta-label">Date</div>
                <div className="bill-meta-value">{created.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
              </div>
              <div className="bill-meta-item">
                <div className="bill-meta-label">Status</div>
                <div className="bill-meta-value" style={{ color: sm.color }}>{sm.label}</div>
              </div>
            </div>
          </div>

          <div className="bill-body">
            <div style={{ marginBottom: "15px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "bold", letterSpacing: "0.05em", textTransform: "uppercase", color: "#666", marginBottom: "5px" }}>BILL TO</div>
                <div style={{ fontSize: "15px", fontWeight: "bold", color: "#000", marginBottom: "5px" }}>{c?.name ?? "—"}</div>
                {c?.address && <div style={{ fontSize: "12px", color: "#333", lineHeight: "1.6", marginBottom: "5px" }}>{c.address}</div>}
                {c?.mobile && <div style={{ fontSize: "12px", color: "#333", marginBottom: "3px" }}>📱 {c.mobile}</div>}
                {c?.email && <div style={{ fontSize: "12px", color: "#333", marginBottom: "3px" }}>📧 {c.email}</div>}
                {(bill.buyer_gst_number || c?.gst_number) && <div style={{ fontSize: "12px", color: "#333", marginTop: "5px" }}>GST: {bill.buyer_gst_number || c?.gst_number}</div>}
              </div>
              {company.gst_number && (
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "bold", letterSpacing: "0.05em", textTransform: "uppercase", color: "#666", marginBottom: "5px" }}>BILL FROM</div>
                  <div style={{ fontSize: "12px", color: "#333", lineHeight: "1.7" }}>
                    <div style={{ fontWeight: "bold", color: "#000", marginBottom: "4px", fontSize: "13px" }}>{company.name}</div>
                    <div style={{ marginBottom: "3px" }}>{company.address}</div>
                    <div>GST: {company.gst_number}</div>
                  </div>
                </div>
              )}
            </div>

            <table className="bill-table">
              <thead>
                <tr>
                  <th className="bill-th">Item</th>
                  <th className="bill-th" style={{ textAlign: "center", width: "60px" }}>Qty</th>
                  <th className="bill-th" style={{ textAlign: "right", width: "100px" }}>Unit Price</th>
                  <th className="bill-th" style={{ textAlign: "right", width: "100px" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any) => (
                  <tr key={it.id} className="bill-item-row">
                    <td>
                      <div className="bill-item-cell">
                        {it.image_url && (
                          <img src={it.image_url} alt={it.item_name} className="bill-item-image" />
                        )}
                        <div className="bill-item-details">
                          <div className="bill-item-name">{it.item_name}</div>
                          {it.description && <div className="bill-item-desc">{it.description}</div>}
                          {it.features && Array.isArray(it.features) && it.features.length > 0 && (
                            <div className="bill-item-desc" style={{ marginTop: "4px", fontStyle: "italic", color: "#555" }}>
                              {it.features.map((f: string, idx: number) => (
                                <div key={idx}>• {f}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="bill-qty-cell">{it.quantity}</td>
                    <td className="bill-price-cell">{formatINR(Number(it.unit_price))}</td>
                    <td className="bill-total-cell">{formatINR(Number(it.total_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bill-summary">
              <div>
                {bill.notes && (
                  <div className="bill-notes-section">
                    <div className="bill-notes-label">Notes</div>
                    <div className="bill-notes-text">{bill.notes}</div>
                  </div>
                )}
                {bill.payment_terms && (
                  <div className="bill-notes-section" style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "4px", padding: "12px", marginBottom: "10px" }}>
                    <div className="bill-notes-label" style={{ color: "#856404", fontSize: "12px" }}>WARRANTY</div>
                    <div className="bill-notes-text" style={{ color: "#333", fontSize: "12px", lineHeight: "1.5" }}>{bill.payment_terms}</div>
                  </div>
                )}
                {(bill.account_number || bill.ifsc_code || bill.bank_name || bill.bank_branch) && (
                  <div className="bill-notes-section">
                    <div className="bill-notes-label">Bank Details</div>
                    <div className="bill-notes-text">
                      {bill.account_number && <div>Account: {bill.account_number}</div>}
                      {bill.ifsc_code && <div>IFSC: {bill.ifsc_code}</div>}
                      {bill.bank_name && <div>Bank: {bill.bank_name}</div>}
                      {bill.bank_branch && <div>Branch: {bill.bank_branch}</div>}
                    </div>
                  </div>
                )}
              </div>

              <div className="bill-summary-box">
                <div className="bill-sum-row">
                  <span className="bill-sum-label">Subtotal</span>
                  <span className="bill-sum-value">{formatINR(Number(bill.subtotal))}</span>
                </div>
                {Number(bill.discount_amount) > 0 && (
                  <div className="bill-sum-row">
                    <span className="bill-sum-label">Discount</span>
                    <span className="bill-sum-value">− {formatINR(Number(bill.discount_amount))}</span>
                  </div>
                )}
                {bill.gst_enabled && (
                  <div className="bill-sum-row">
                    <span className="bill-sum-label">GST ({bill.gst_percentage}%)</span>
                    <span className="bill-sum-value">{formatINR(Number(bill.gst_amount))}</span>
                  </div>
                )}
                <div className="bill-grand-total">
                  <span>Total</span>
                  <span>{formatINR(Number(bill.total_amount))}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bill-footer">
            <div style={{ marginBottom: "8px" }}>
              <strong>Thank you for your business!</strong>
            </div>
            <div>
              Invoice generated on {created.toLocaleDateString("en-IN")}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
