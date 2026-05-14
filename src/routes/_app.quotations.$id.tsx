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
  const { quotation: quotData, items, company } = Route.useLoaderData();
  const quotation = quotData as any;
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
    toast.success(`Status updated to ${s}`);
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
        buyer_gst_number: quotation.buyer_gst_number,
        notes: quotation.notes,
        terms: quotation.terms,
        account_number: quotation.account_number,
        ifsc_code: quotation.ifsc_code,
        bank_name: quotation.bank_name,
        bank_branch: quotation.bank_branch,
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

  const statusMeta: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    draft:    { label: "Draft",    color: "#7c2d12", bg: "rgba(254,243,199,0.9)", border: "#fde68a", icon: <FileText size={13} /> },
    sent:     { label: "Sent",     color: "#1f2937", bg: "rgba(243,244,246,0.9)", border: "#e5e7eb", icon: <Send size={13} /> },
    approved: { label: "Approved", color: "#065f46", bg: "rgba(209,250,229,0.9)", border: "#6ee7b7", icon: <CheckCircle2 size={13} /> },
  };
  const sm = statusMeta[quotation.status] ?? statusMeta.draft;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        :root {
          --ink:     #1f2937;
          --ink-2:   #374151;
          --ink-3:   #4b5563;
          --paper:   #ffffff;
          --paper-2: #f9fafb;
          --paper-3: #e5e7eb;
          --accent:  #6b7280;
          --red:     #dc2626;
          --green:   #059669;
          --radius:  4px;
        }

        .qv-root { font-family: 'Inter', sans-serif; background: var(--paper-2); }

        /* TOOLBAR */
        .qv-toolbar {
          background: white;
          border: 1px solid var(--paper-3);
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .qv-btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-radius: 4px;
          font-size: 14px; font-weight: 600;
          color: var(--ink); background: transparent;
          border: 1px solid transparent;
          cursor: pointer; transition: all 0.15s;
          text-decoration: none;
        }
        .qv-btn-ghost:hover { background: var(--paper-2); }

        .qv-btn-outline {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 14px; border-radius: 4px;
          font-size: 14px; font-weight: 600;
          color: var(--ink); background: var(--paper-2);
          border: 1px solid var(--paper-3);
          cursor: pointer; transition: all 0.15s;
        }
        .qv-btn-outline:hover { background: var(--paper-3); }

        .qv-btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 14px; border-radius: 4px;
          font-size: 14px; font-weight: 600;
          color: white;
          background: #1f2937;
          border: 1px solid #1f2937;
          cursor: pointer; transition: all 0.15s;
        }
        .qv-btn-primary:hover { background: #374151; border-color: #374151; }

        .qv-btn-danger {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 12px; border-radius: 4px;
          color: #dc2626; background: transparent;
          border: 1px transparent;
          cursor: pointer; transition: all 0.15s;
        }
        .qv-btn-danger:hover { background: rgba(220,38,38,0.1); }

        /* DOCUMENT */
        .qv-document {
          background: white;
          border: 1px solid var(--paper-3);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        /* HEADER */
        .qv-header {
          background: white;
          padding: 32px 40px;
          border-bottom: 2px solid var(--paper-3);
        }

        .qv-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 30px;
          margin-bottom: 24px;
        }

        .qv-company-section {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .qv-company-logo {
          width: 56px;
          height: 56px;
          background: var(--ink);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .qv-company-logo img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .qv-company-info h1 {
          font-size: 24px;
          font-weight: 800;
          color: var(--ink);
          margin: 0 0 4px 0;
          letter-spacing: -0.01em;
        }

        .qv-company-info p {
          font-size: 13px;
          color: var(--accent);
          margin: 0;
          line-height: 1.5;
        }

        .qv-quotation-num {
          text-align: right;
        }

        .qv-quotation-num-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .qv-quotation-num-value {
          font-size: 32px;
          font-weight: 700;
          color: var(--ink);
          font-family: 'Courier New', monospace;
          letter-spacing: 0.05em;
        }

        /* META STRIP */
        .qv-meta-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .qv-meta-item {
          display: flex;
          flex-direction: column;
        }

        .qv-meta-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .qv-meta-value {
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
        }

        /* BODY GRID */
        .qv-body-grid {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 0;
          min-height: 300px;
        }

        /* BILL-TO PANEL */
        .qv-bill-panel {
          background: var(--paper-2);
          padding: 28px 24px;
          border-right: 1px solid var(--paper-3);
        }

        .qv-bill-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .qv-customer-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 12px;
        }

        .qv-bill-divider {
          height: 1px;
          background: var(--paper-3);
          margin: 8px 0 12px 0;
        }

        .qv-contact-item {
          font-size: 12px;
          color: var(--ink-3);
          line-height: 1.6;
          margin-bottom: 6px;
        }

        .qv-status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 3px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          margin-top: 12px;
        }

        /* ITEMS TABLE */
        .qv-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .qv-table thead {
          background: var(--paper-2);
        }

        .qv-table th {
          padding: 12px 14px;
          text-align: left;
          font-size: 11px;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border-bottom: 1px solid var(--paper-3);
        }

        .qv-table th:nth-child(3),
        .qv-table th:nth-child(4),
        .qv-table th:nth-child(5) {
          text-align: right;
        }

        .qv-table tbody tr {
          border-bottom: 1px solid var(--paper-3);
        }

        .qv-table tbody tr:last-child {
          border-bottom: none;
        }

        .qv-table td {
          padding: 16px 14px;
          font-size: 13px;
          color: var(--ink);
        }

        .qv-table td:nth-child(3),
        .qv-table td:nth-child(4),
        .qv-table td:nth-child(5) {
          text-align: right;
        }

        .qv-item-num {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          font-weight: 700;
          color: var(--accent);
        }

        .qv-item-cell {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .qv-item-image {
          width: 60px;
          height: 60px;
          background: var(--paper-2);
          border: 1px solid var(--paper-3);
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }

        .qv-item-image img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .qv-item-details {
          flex: 1;
        }

        .qv-item-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 3px;
        }

        .qv-item-desc {
          font-size: 12px;
          color: var(--accent);
          line-height: 1.4;
          margin-bottom: 4px;
        }

        .qv-item-features {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .qv-feature {
          font-size: 11px;
          background: var(--paper-2);
          color: var(--ink-3);
          padding: 2px 6px;
          border-radius: 2px;
          border: 1px solid var(--paper-3);
        }

        .qv-qty {
          font-weight: 700;
          color: var(--ink);
        }

        .qv-unit-price {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: var(--ink);
        }

        .qv-line-total {
          font-family: 'Courier New', monospace;
          font-weight: 700;
          color: var(--ink);
        }

        /* FOOTER SECTION */
        .qv-footer {
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: 40px;
          padding: 28px 40px;
          border-top: 1px solid var(--paper-3);
          background: var(--paper-2);
        }

        .qv-notes-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .qv-notes-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .qv-notes-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .qv-notes-text {
          font-size: 13px;
          color: var(--ink-3);
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .qv-totals-box {
          background: white;
          border: 1px solid var(--paper-3);
          border-radius: 3px;
        }

        .qv-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid var(--paper-3);
          font-size: 13px;
        }

        .qv-total-row:last-child {
          border-bottom: none;
        }

        .qv-total-label {
          font-weight: 600;
          color: var(--ink-3);
        }

        .qv-total-value {
          font-family: 'Courier New', monospace;
          font-weight: 700;
          color: var(--ink);
        }

        .qv-grand-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          background: var(--ink);
          color: white;
        }

        .qv-grand-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .qv-grand-value {
          font-family: 'Courier New', monospace;
          font-size: 22px;
          font-weight: 700;
        }

        /* PRINT STYLES */
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body {
            margin: 0;
            padding: 0;
            width: 210mm;
            height: 297mm;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .qv-root {
            max-width: 210mm;
            margin: 0;
            padding: 0;
            background: white;
          }
          .qv-document {
            box-shadow: none;
            border: none;
            width: 210mm;
            margin: 0;
            border-radius: 0;
          }
          .qv-header {
            padding: 20px 30px;
            border-bottom: 2px solid var(--paper-3);
          }
          .qv-header-top {
            margin-bottom: 16px;
            gap: 20px;
          }
          .qv-company-info h1 {
            font-size: 20px;
          }
          .qv-quotation-num-value {
            font-size: 24px;
          }
          .qv-meta-strip {
            gap: 16px;
          }
          .qv-meta-item {
            gap: 2px;
          }
          .qv-meta-label {
            font-size: 10px;
          }
          .qv-meta-value {
            font-size: 13px;
          }
          .qv-body-grid {
            min-height: auto;
          }
          .qv-bill-panel {
            padding: 20px 18px;
            border-right: 1px solid var(--paper-3);
          }
          .qv-customer-name {
            font-size: 16px;
          }
          .qv-contact-item {
            font-size: 11px;
          }
          .qv-table th {
            padding: 8px 10px;
            font-size: 10px;
          }
          .qv-table td {
            padding: 10px;
            font-size: 12px;
          }
          .qv-item-image {
            width: 50px;
            height: 50px;
          }
          .qv-item-name {
            font-size: 12px;
          }
          .qv-item-desc {
            font-size: 11px;
          }
          .qv-footer {
            padding: 20px 30px;
            gap: 30px;
          }
          .qv-totals-box {
            display: flex;
            flex-direction: column;
          }
          .qv-total-row {
            padding: 8px 10px;
            font-size: 12px;
          }
          .qv-grand-value {
            font-size: 18px;
          }
        }

        /* MOBILE */
        @media (max-width: 768px) {
          .qv-header-top {
            flex-direction: column;
            gap: 16px;
            margin-bottom: 16px;
          }
          .qv-quotation-num {
            text-align: left;
          }
          .qv-meta-strip {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .qv-body-grid {
            grid-template-columns: 1fr;
          }
          .qv-bill-panel {
            border-right: none;
            border-bottom: 1px solid var(--paper-3);
            padding: 20px 24px;
          }
          .qv-footer {
            grid-template-columns: 1fr;
            gap: 20px;
            padding: 20px 24px;
          }
          .qv-item-cell {
            flex-direction: column;
          }
          .qv-item-image {
            width: 100%;
            height: 80px;
          }
        }
      `}</style>

      <div className="qv-root mx-auto max-w-5xl space-y-4 p-4">

        {/* TOOLBAR */}
        <div className="no-print qv-toolbar flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-3">
          <div className="flex items-center gap-2">
            <Link to="/quotations" className="qv-btn-ghost">
              <ArrowLeft size={16} /> Back
            </Link>
            <div className="qv-status-badge" style={{ color: sm.color, background: sm.bg, borderColor: sm.border, border: "1px solid " + sm.border }}>
              {sm.icon}
              {sm.label}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={quotation.status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px] border-gray-300 text-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
            <button className="qv-btn-outline" onClick={duplicate}>
              <Copy size={15} /> Duplicate
            </button>
            <button className="qv-btn-primary" onClick={() => window.print()}>
              <Printer size={15} /> Print PDF
            </button>
            <button className="qv-btn-danger" onClick={remove}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* DOCUMENT */}
        <div className="qv-document">

          {/* HEADER */}
          <div className="qv-header">
            <div className="qv-header-top">
              <div className="qv-company-section">
                <div className="qv-company-logo">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} />
                  ) : (
                    <span style={{ color: "white", fontSize: 24, fontWeight: 700 }}>
                      {company.name?.[0] ?? "Q"}
                    </span>
                  )}
                </div>
                <div className="qv-company-info">
                  <h1>{company.name}</h1>
                  <p>{company.address || ""}</p>
                  {company.gst_number && <p>GST: {company.gst_number}</p>}
                  <p>
                    {company.phone && <span>{company.phone}</span>}
                    {company.phone && company.email && <span> · </span>}
                    {company.email && <span>{company.email}</span>}
                  </p>
                </div>
              </div>
              <div className="qv-quotation-num">
                <div className="qv-quotation-num-label">Quotation No.</div>
                <div className="qv-quotation-num-value">{quotation.quotation_number}</div>
              </div>
            </div>

            {/* META STRIP */}
            <div className="qv-meta-strip">
              <div className="qv-meta-item">
                <div className="qv-meta-label">Issue Date</div>
                <div className="qv-meta-value">
                  {created.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
              <div className="qv-meta-item">
                <div className="qv-meta-label">Valid Until</div>
                <div className="qv-meta-value">
                  {validUntil.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
              </div>
              <div className="qv-meta-item">
                <div className="qv-meta-label">Status</div>
                <div className="qv-meta-value" style={{ color: sm.color }}>{sm.label}</div>
              </div>
            </div>
          </div>

          {/* BODY: BILL-TO + ITEMS */}
          <div className="qv-body-grid">

            {/* BILL-TO PANEL */}
            <div className="qv-bill-panel">
              <div className="qv-bill-label">Bill To</div>
              <div className="qv-customer-name">{c?.name ?? "—"}</div>
              <div className="qv-bill-divider" />

              {c?.address && <div className="qv-contact-item">{c.address}</div>}
              {c?.mobile && <div className="qv-contact-item">Phone: {c.mobile}</div>}
              {c?.email && <div className="qv-contact-item">Email: {c.email}</div>}
              {(quotation.buyer_gst_number || c?.gst_number) && (
                <div className="qv-contact-item">GST: {quotation.buyer_gst_number || c?.gst_number}</div>
              )}

              <div className="qv-status-badge" style={{ color: sm.color, background: sm.bg, borderColor: sm.border, border: "1px solid " + sm.border }}>
                {sm.icon} {sm.label}
              </div>
            </div>

            {/* ITEMS TABLE */}
            <div>
              <table className="qv-table">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>Description</th>
                    <th style={{ width: 50 }}>Qty</th>
                    <th style={{ width: 90 }}>Unit Price</th>
                    <th style={{ width: 90 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any, idx: number) => (
                    <tr key={it.id}>
                      <td><div className="qv-item-num">{String(idx + 1).padStart(2, "0")}</div></td>
                      <td>
                        <div className="qv-item-cell">
                          {it.image_url ? (
                            <div className="qv-item-image">
                              <img src={it.image_url} alt={it.item_name} />
                            </div>
                          ) : (
                            <div className="qv-item-image" style={{ background: "var(--paper-2)", justifyContent: "center" }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <path d="m21 15-5-5L5 21"/>
                              </svg>
                            </div>
                          )}
                          <div className="qv-item-details">
                            <div className="qv-item-name">{it.item_name}</div>
                            {it.description && <div className="qv-item-desc">{it.description}</div>}
                            {it.features?.length > 0 && (
                              <div className="qv-item-features">
                                {it.features.map((f: string, i: number) => (
                                  <span key={i} className="qv-feature">• {f}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td><div className="qv-qty">{it.quantity}</div></td>
                      <td><div className="qv-unit-price">{formatINR(Number(it.unit_price))}</div></td>
                      <td><div className="qv-line-total">{formatINR(Number(it.total_price))}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER: NOTES + TOTALS */}
          <div className="qv-footer">
            <div className="qv-notes-section">
              {quotation.notes && (
                <div className="qv-notes-block">
                  <div className="qv-notes-label">Notes</div>
                  <div className="qv-notes-text">{quotation.notes}</div>
                </div>
              )}
              {quotation.terms && (
                <div className="qv-notes-block">
                  <div className="qv-notes-label">Terms & Conditions</div>
                  <div className="qv-notes-text">{quotation.terms}</div>
                </div>
              )}
              {(quotation.account_number || quotation.ifsc_code || quotation.bank_name || quotation.bank_branch) && (
                <div className="qv-notes-block">
                  <div className="qv-notes-label">Bank Details</div>
                  <div className="qv-notes-text">
                    {quotation.account_number && <div>Account: {quotation.account_number}</div>}
                    {quotation.ifsc_code && <div>IFSC: {quotation.ifsc_code}</div>}
                    {quotation.bank_name && <div>Bank: {quotation.bank_name}</div>}
                    {quotation.bank_branch && <div>Branch: {quotation.bank_branch}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* TOTALS */}
            <div className="qv-totals-box">
              <div className="qv-total-row">
                <span className="qv-total-label">Subtotal</span>
                <span className="qv-total-value">{formatINR(Number(quotation.subtotal))}</span>
              </div>
              {Number(quotation.discount_amount) > 0 && (
                <div className="qv-total-row">
                  <span className="qv-total-label">
                    Discount{quotation.discount_type === "percentage" ? ` (${quotation.discount_value}%)` : ""}
                  </span>
                  <span className="qv-total-value" style={{ color: "var(--red)" }}>
                    − {formatINR(Number(quotation.discount_amount))}
                  </span>
                </div>
              )}
              {quotation.gst_enabled && (
                <div className="qv-total-row">
                  <span className="qv-total-label">GST ({quotation.gst_percentage}%)</span>
                  <span className="qv-total-value">{formatINR(Number(quotation.gst_amount))}</span>
                </div>
              )}
              <div className="qv-grand-total">
                <div className="qv-grand-label">Grand Total</div>
                <div className="qv-grand-value">{formatINR(Number(quotation.total_amount))}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

/* ── Sub-components ── */

function MetaCell({ label, value, valueStyle, labelSize = 11, valueSize = 15 }: {
  label: string; value: string; valueStyle?: React.CSSProperties; labelSize?: number; valueSize?: number;
}) {
  return (
    <div>
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(147,197,253,0.6)", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: valueSize, color: "white", ...valueStyle }}>
        {value}
      </div>
    </div>
  );
}

function TotRow({ label, value, valueColor, labelSize = 14, valueSize = 14 }: {
  label: string; value: string; valueColor?: string; labelSize?: number; valueSize?: number;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <span style={{ fontSize: labelSize, color: "#3b6494" }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: valueSize, fontWeight: 600, color: valueColor ?? "#071428" }}>
        {value}
      </span>
    </div>
  );
}