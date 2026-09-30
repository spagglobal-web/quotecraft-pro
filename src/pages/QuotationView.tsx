import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/pricing";
import { loadCompany } from "@/lib/company";
import { ArrowLeft, Copy, Printer, Trash2, CheckCircle2, Send, FileText, Pencil } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function QuotationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const company = loadCompany();

  async function load() {
    const { data: q } = await supabase.from("quotations").select("*, customers(*), quotation_items(*)").eq("id", id!).single();
    setData(q);
  }
  useEffect(() => { if (id) load(); }, [id]);

  if (!data) return <div className="p-8 text-center">Loading...</div>;
  const quotation = data as any;
  const items = (quotation.quotation_items ?? []).sort((a: any, b: any) => a.position - b.position);
  const showcaseItems = items.flatMap((item: any) => [
    { ...item, showcaseKey: `item-${item.id}`, showcaseName: item.item_name, showcaseDescription: item.features?.[0] || item.description },
    ...(item.accessories ?? []).map((accessory: any, index: number) => ({
      ...accessory,
      showcaseKey: `accessory-${item.id}-${index}`,
      showcaseName: accessory.item_name,
      showcaseDescription: accessory.description,
    })),
  ]).slice(0, 3);
  const c = quotation.customers as any;
  const created = new Date(quotation.quotation_date || quotation.created_at);
  const validUntil = new Date(created);
  validUntil.setDate(validUntil.getDate() + (quotation.validity_days ?? 7));

  async function setStatus(s: string) {
    const { error } = await supabase.from("quotations").update({ status: s as any }).eq("id", quotation.id);
    if (error) return toast.error(error.message);
    toast.success(`Status updated`);
    load();
  }

  async function duplicate() {
    const { data: nq, error } = await supabase.from("quotations").insert([{
      customer_id: quotation.customer_id, subtotal: quotation.subtotal, gst_amount: quotation.gst_amount,
      cgst_percentage: quotation.cgst_percentage, sgst_percentage: quotation.sgst_percentage,
      cgst_amount: quotation.cgst_amount, sgst_amount: quotation.sgst_amount, gst_enabled: quotation.gst_enabled,
      discount_value: quotation.discount_value, discount_type: quotation.discount_type,
      discount_amount: quotation.discount_amount, total_amount: quotation.total_amount,
      status: "draft", validity_days: quotation.validity_days,
      buyer_gst_number: quotation.buyer_gst_number, notes: quotation.notes, terms: quotation.terms,
      account_number: quotation.account_number, ifsc_code: quotation.ifsc_code,
      account_holder_name: quotation.account_holder_name,
      bank_name: quotation.bank_name, bank_branch: quotation.bank_branch,
    }] as any).select().single();
    if (error || !nq) return toast.error(error?.message ?? "Failed");
    await supabase.from("quotation_items").insert(items.map((i: any) => ({
      quotation_id: nq.id, model_id: i.model_id, item_name: i.item_name,
      description: i.description, features: i.features, image_url: i.image_url, color_name: i.color_name ?? null,
      accessories: i.accessories ?? [],
      quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price, position: i.position,
    })));
    toast.success(`Duplicated as ${nq.quotation_number}`);
    navigate(`/quotations/${nq.id}`);
  }

  async function remove() {
    if (!confirm("Delete this quotation?")) return;
    const { error } = await supabase.from("quotations").delete().eq("id", quotation.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate("/quotations");
  }

  const statusMeta: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    draft: { label: "Draft", color: "#7c2d12", bg: "rgba(254,243,199,0.9)", border: "#fde68a", icon: <FileText size={13} /> },
    sent: { label: "Sent", color: "#1f2937", bg: "rgba(243,244,246,0.9)", border: "#e5e7eb", icon: <Send size={13} /> },
    approved: { label: "Approved", color: "#065f46", bg: "rgba(209,250,229,0.9)", border: "#6ee7b7", icon: <CheckCircle2 size={13} /> },
  };
  const sm = statusMeta[quotation.status] ?? statusMeta.draft;

  return (
    <>
      <style>{`
        .qv-root { font-family: 'Inter', sans-serif; background: #f9fafb; }
        .qv-toolbar { background: white; border: 1px solid #e5e7eb; border-radius: 4px; }
        .qv-btn-ghost, .qv-btn-outline, .qv-btn-primary, .qv-btn-danger {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 14px; border-radius: 4px; font-size: 14px; font-weight: 600;
          cursor: pointer; text-decoration: none; transition: all 0.15s;
        }
        .qv-btn-ghost { color: #1f2937; background: transparent; border: 1px solid transparent; }
        .qv-btn-ghost:hover { background: #f9fafb; }
        .qv-btn-outline { color: #1f2937; background: #f9fafb; border: 1px solid #e5e7eb; }
        .qv-btn-primary { color: white; background: #1f2937; border: 1px solid #1f2937; }
        .qv-btn-danger { color: #dc2626; background: transparent; border: 1px solid transparent; }
        .qv-document { width: 210mm; max-width: 100%; min-height: 297mm; box-sizing: border-box; background: white; border: 1px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .qv-header { padding: 28px 40px; border-bottom: 2px solid #e5e7eb; }
        .qv-header-top { display: flex; justify-content: space-between; align-items: center; gap: 30px; margin-bottom: 24px; }
        .qv-company-section { display: flex; gap: 20px; align-items: center; }
        .qv-company-logo { width: 130px; height: 130px; background: #1f2937; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .qv-company-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .qv-company-info h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px; color: #1f2937; }
        .qv-company-info p { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.5; }
        .qv-quotation-meta { display: flex; flex-direction: column; gap: 6px; }
        .qv-quotation-title { font-size: 22px; font-weight: 700; color: #1f2937; }
        .qv-meta-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        .qv-meta-label { font-size: 11px; font-weight: 700; color: #6b7280; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 4px; }
        .qv-meta-value { font-size: 15px; font-weight: 600; color: #1f2937; }
        .qv-body-grid { display: grid; grid-template-columns: 200px 1fr; }
        .qv-bill-panel { background: #f9fafb; padding: 28px 24px; border-right: 1px solid #e5e7eb; }
        .qv-bill-label { font-size: 11px; font-weight: 700; color: #6b7280; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 12px; }
        .qv-customer-name { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 12px; }
        .qv-bill-divider { height: 1px; background: #e5e7eb; margin: 8px 0 12px; }
        .qv-contact-item { font-size: 12px; color: #4b5563; line-height: 1.6; margin-bottom: 6px; }
        .qv-status-badge { display: inline-block; padding: 4px 10px; border-radius: 3px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 12px; }
        .qv-table { width: 100%; border-collapse: collapse; }
        .qv-table thead { background: #f9fafb; }
        .qv-table th { padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #6b7280; letter-spacing: 0.05em; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
        .qv-table th:nth-child(3), .qv-table th:nth-child(4), .qv-table th:nth-child(5) { text-align: right; }
        .qv-table tbody tr { border-bottom: 1px solid #e5e7eb; }
        .qv-table td { padding: 16px 14px; font-size: 13px; color: #1f2937; }
        .qv-table td:nth-child(3), .qv-table td:nth-child(4), .qv-table td:nth-child(5) { text-align: right; }
        .qv-item-cell { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
        .qv-item-image { width: 150px; height: 150px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 3px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
        .qv-item-image img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .qv-item-name { font-size: 13px; font-weight: 700; color: #1f2937; margin-bottom: 3px; }
        .qv-item-desc { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: #6b7280; line-height: 1.4; }
        .qv-product-showcase { display: grid; gap: 14px; padding: 16px 14px; border-bottom: 1px solid #e5e7eb; }
        .qv-product-descriptions, .qv-product-images { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .qv-product-description { min-height: 64px; }
        .qv-product-description strong { display: block; font-size: 14px; margin-bottom: 5px; }
        .qv-product-description span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 1.4; color: #6b7280; }
        .qv-product-image { width: 100%; aspect-ratio: 5 / 6; height: auto; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 3px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .qv-product-image img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .qv-footer { display: grid; grid-template-columns: 1fr 220px; gap: 40px; padding: 28px 40px; border-top: 1px solid #e5e7eb; background: #f9fafb; }
        .qv-notes-label { font-size: 11px; font-weight: 700; color: #6b7280; letter-spacing: 0.05em; text-transform: uppercase; }
        .qv-notes-text { font-size: 13px; color: #4b5563; line-height: 1.6; white-space: pre-wrap; }
        .qv-totals-box { background: white; border: 1px solid #e5e7eb; border-radius: 3px; }
        .qv-total-row { display: flex; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        .qv-total-label { font-weight: 600; color: #4b5563; }
        .qv-total-value { font-family: 'Courier New', monospace; font-weight: 700; color: #1f2937; }
        .qv-grand-total { display: flex; justify-content: space-between; padding: 12px 14px; background: #1f2937; color: white; }
        .qv-grand-label { font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .qv-grand-value { font-family: 'Courier New', monospace; font-size: 22px; font-weight: 700; }
        @page { size: A4 portrait; margin: 5mm; }
        @media print {
          html, body { margin: 0; padding: 0; background: white; }
          .no-print { display: none !important; }
          .qv-root { width: 200mm; max-width: none; padding: 0; margin: 0; }
          .qv-document { width: 200mm; min-height: 0; height: auto; max-height: none; overflow: visible; display: flex; flex-direction: column; page-break-after: avoid; break-after: avoid-page; box-shadow: none; border: none; }
          .qv-header { padding: 0; }
          .qv-header-top { height: 50mm; box-sizing: border-box; padding: 2mm 5mm; gap: 0; margin-bottom: 0; }
          .qv-company-section { width: 100%; min-width: 0; gap: 5mm; }
          .qv-company-logo { width: 45mm; height: 45mm; border-radius: 0; }
          .qv-company-info { flex: 1; min-width: 0; }
          .qv-company-info h1 { font-size: 30px; line-height: 1.1; overflow-wrap: anywhere; margin-bottom: 1mm; }
          .qv-company-info p { font-size: 14px; line-height: 1.3; overflow-wrap: anywhere; }
          .qv-quotation-meta { height: 30mm; box-sizing: border-box; padding: 2mm 6mm; gap: 1mm; }
          .qv-quotation-title { font-size: 20px; line-height: 1.1; }
          .qv-meta-strip { flex: 1; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2mm; }
          .qv-meta-strip > div { min-width: 0; padding: 1.5mm; border: 1px solid #e5e7eb; display: flex; flex-direction: column; justify-content: center; }
          .qv-meta-label { font-size: 8px; line-height: 1.1; margin-bottom: 1mm; }
          .qv-meta-value { font-size: 10px; line-height: 1.15; overflow-wrap: anywhere; }
          .qv-body-grid { grid-template-columns: 165px 1fr; }
          .qv-bill-panel { padding: 12px 10px; }
          .qv-customer-name { font-size: 14px; margin-bottom: 8px; }
          .qv-contact-item { font-size: 10px; line-height: 1.35; margin-bottom: 3px; }
          .qv-product-showcase { gap: 6px; padding: 8px; }
          .qv-product-descriptions, .qv-product-images { gap: 6px; }
          .qv-product-description { min-height: 0; max-height: none; overflow: visible; }
          .qv-product-description strong { font-size: 11px; margin-bottom: 2px; }
          .qv-product-description span { font-size: 9px; line-height: 1.2; }
          .qv-product-image { aspect-ratio: 5 / 6; height: auto; }
          .qv-table th { padding: 4px 6px; font-size: 9px; }
          .qv-table td { padding: 4px 6px; font-size: 10px; }
          .qv-item-name { font-size: 10px; }
          .qv-footer { gap: 12px; padding: 10px 20px; grid-template-columns: 1fr 175px; }
          .qv-document > .qv-footer { margin-top: 4px; }
          .qv-notes-label { font-size: 9px; }
          .qv-notes-text { font-size: 10px; line-height: 1.3; }
          .qv-total-row { padding: 4px 8px; font-size: 10px; }
          .qv-grand-total { padding: 6px 8px; }
          .qv-grand-value { font-size: 16px; }
          .qv-table tr, .qv-footer, .qv-product-showcase { break-inside: avoid; }
        }
      `}</style>
      <div className="qv-root mx-auto max-w-5xl space-y-4 p-4">
        <div className="no-print qv-toolbar flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-3">
          <div className="flex items-center gap-2">
            <Link to="/quotations" className="qv-btn-ghost"><ArrowLeft size={16} /> Back</Link>
            <div className="qv-status-badge" style={{ color: sm.color, background: sm.bg, border: "1px solid " + sm.border }}>{sm.icon} {sm.label}</div>
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
            <button className="qv-btn-outline" onClick={() => navigate(`/quotations/${quotation.id}/edit`)}><Pencil size={15} /> Edit</button>
            <button className="qv-btn-outline" onClick={duplicate}><Copy size={15} /> Duplicate</button>
            <button className="qv-btn-primary" onClick={() => window.print()}><Printer size={15} /> Print PDF</button>
            <button className="qv-btn-danger" onClick={remove}><Trash2 size={16} /></button>
          </div>
        </div>

        <div className="qv-document">
          <div className="qv-header">
            <div className="qv-header-top">
              <div className="qv-company-section">
                <div className="qv-company-logo">
                  {company.logo_url ? <img src={company.logo_url} alt={company.name} /> : <span style={{ color: "white", fontSize: 24, fontWeight: 700 }}>{company.name?.[0] ?? "Q"}</span>}
                </div>
                <div className="qv-company-info">
                  <h1>{company.name}</h1>
                  <p>{company.address || ""}</p>
                  {company.gst_number && <p>GST: {company.gst_number}</p>}
                  <p>{company.phone}{company.phone && company.email ? " · " : ""}{company.email}</p>
                </div>
              </div>
            </div>
            <div className="qv-quotation-meta">
              <div className="qv-quotation-title">QUOTATION</div>
              <div className="qv-meta-strip">
                <div><div className="qv-meta-label">Quotation No.</div><div className="qv-meta-value">{quotation.custom_quotation_number || quotation.quotation_number}</div></div>
                <div><div className="qv-meta-label">Issue Date</div><div className="qv-meta-value">{created.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div></div>
                <div><div className="qv-meta-label">Valid Until</div><div className="qv-meta-value">{validUntil.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div></div>
                <div><div className="qv-meta-label">Status</div><div className="qv-meta-value" style={{ color: sm.color }}>{sm.label}</div></div>
              </div>
            </div>
          </div>

          <div className="qv-body-grid">
            <div className="qv-bill-panel">
              <div className="qv-bill-label">Bill To</div>
              <div className="qv-customer-name">{c?.name ?? "—"}</div>
              <div className="qv-bill-divider" />
              {c?.address && <div className="qv-contact-item">{c.address}</div>}
              {c?.mobile && <div className="qv-contact-item">Phone: {c.mobile}</div>}
              {c?.email && <div className="qv-contact-item">Email: {c.email}</div>}
              {(quotation.buyer_gst_number || c?.gst_number) && <div className="qv-contact-item">GST: {quotation.buyer_gst_number || c?.gst_number}</div>}
            </div>
            <div>
              <div className="qv-product-showcase">
                <div className="qv-product-descriptions">
                  {showcaseItems.map((it: any) => <div className="qv-product-description" key={`description-${it.showcaseKey}`}><strong>{it.showcaseName}</strong><span>{it.showcaseDescription || "No description provided"}</span></div>)}
                </div>
                <div className="qv-product-images">
                  {showcaseItems.map((it: any) => <div className="qv-product-image" key={`image-${it.showcaseKey}`}>{it.image_url ? <img src={it.image_url} alt={it.showcaseName} /> : <span className="qv-product-desc">No image</span>}</div>)}
                </div>
              </div>
              <table className="qv-table">
                <thead><tr><th style={{ width: 30 }}>#</th><th>Product</th><th style={{ width: 50 }}>Qty</th><th style={{ width: 90 }}>Unit Price</th><th style={{ width: 90 }}>Amount</th></tr></thead>
                <tbody>
                  {items.map((it: any, idx: number) => (
                    <tr key={it.id}>
                      <td><div style={{ fontFamily: "monospace", fontWeight: 700, color: "#6b7280" }}>{String(idx + 1).padStart(2, "0")}</div></td>
                      <td>
                        <div className="qv-item-name">{it.item_name}</div>
                        {it.color_name && <div className="qv-item-desc">Colour: {it.color_name}</div>}
                        {(it.features?.[0] || it.description) && <div className="qv-item-desc">{it.features?.[0] || it.description}</div>}
                        {(it.accessories ?? []).map((accessory: any, accessoryIndex: number) => (
                          <div className="qv-item-desc" key={`${it.id}-accessory-${accessoryIndex}`}>
                            {accessory.productType === "pump" ? "Pump" : "Membrane"}: {accessory.item_name}{accessory.color_name ? ` (${accessory.color_name})` : ""}
                          </div>
                        ))}
                      </td>
                      <td><strong>{it.quantity}</strong></td>
                      <td style={{ fontFamily: "monospace" }}>{formatINR(Number(it.unit_price))}</td>
                      <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{formatINR(Number(it.total_price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="qv-footer">
            <div className="space-y-4">
              {quotation.notes && <div><div className="qv-notes-label">Notes</div><div className="qv-notes-text">{quotation.notes}</div></div>}
              {quotation.terms && <div><div className="qv-notes-label">Terms & Conditions</div><div className="qv-notes-text">{quotation.terms}</div></div>}
              {(quotation.account_number || quotation.bank_name) && (
                <div><div className="qv-notes-label">Bank Details</div><div className="qv-notes-text">
                  <div>{quotation.account_holder_name || "SPAG EAGLE GLOBAL PRIVATE LIMITED"}</div>
                  {quotation.account_number && <div>Account: {quotation.account_number}</div>}
                  {quotation.ifsc_code && <div>IFSC: {quotation.ifsc_code}</div>}
                  {quotation.bank_name && <div>Bank: {quotation.bank_name}</div>}
                  {quotation.bank_branch && <div>Branch: {quotation.bank_branch}</div>}
                </div></div>
              )}
            </div>
            <div className="qv-totals-box">
              <div className="qv-total-row"><span className="qv-total-label">Subtotal</span><span className="qv-total-value">{formatINR(Number(quotation.subtotal))}</span></div>
              {Number(quotation.discount_amount) > 0 && <div className="qv-total-row"><span className="qv-total-label">Discount</span><span className="qv-total-value" style={{ color: "#dc2626" }}>− {formatINR(Number(quotation.discount_amount))}</span></div>}
              {quotation.gst_enabled && <>
                {quotation.cgst_amount !== undefined && quotation.sgst_amount !== undefined ? (
                  <>
                    <div className="qv-total-row"><span className="qv-total-label">CGST ({quotation.cgst_percentage}%)</span><span className="qv-total-value">{formatINR(Number(quotation.cgst_amount))}</span></div>
                    <div className="qv-total-row"><span className="qv-total-label">SGST ({quotation.sgst_percentage}%)</span><span className="qv-total-value">{formatINR(Number(quotation.sgst_amount))}</span></div>
                  </>
                ) : (
                  <div className="qv-total-row"><span className="qv-total-label">GST ({quotation.gst_percentage}%)</span><span className="qv-total-value">{formatINR(Number(quotation.gst_amount))}</span></div>
                )}</>
              }
              <div className="qv-grand-total"><div className="qv-grand-label">Grand Total</div><div className="qv-grand-value">{formatINR(Number(quotation.total_amount))}</div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
