import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/pricing";
import { Eye, Plus, Search } from "lucide-react";

function statColor(s: string) {
  if (s === "approved") return "bg-success text-success-foreground";
  if (s === "sent") return "bg-primary text-primary-foreground";
  return "bg-muted text-muted-foreground";
}

export default function QuotationsList() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("quotations")
        .select("id, quotation_number, total_amount, status, created_at, customer_id, customers(name, mobile)")
        .order("created_at", { ascending: false });
      setQuotations(data ?? []);
    })();
  }, []);

  const filtered = quotations.filter((x: any) => {
    const s = q.toLowerCase();
    return !s || x.quotation_number?.toLowerCase().includes(s) || x.customers?.name?.toLowerCase().includes(s) || x.customers?.mobile?.toLowerCase().includes(s);
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
          <p className="text-sm text-muted-foreground">All quotations issued from your account.</p>
        </div>
        <Button asChild><Link to="/quotations/new"><Plus className="mr-2 h-4 w-4" /> New Quotation</Link></Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">All Quotations ({quotations.length})</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search number, customer..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">No quotations found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3">Number</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q: any) => (
                    <tr key={q.id} className="border-t hover:bg-accent/30">
                      <td className="px-6 py-3 font-semibold">{q.quotation_number}</td>
                      <td className="px-6 py-3">
                        <div className="font-medium">{q.customers?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{q.customers?.mobile}</div>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{new Date(q.created_at).toLocaleDateString("en-IN")}</td>
                      <td className="px-6 py-3"><Badge className={statColor(q.status)} variant="secondary">{q.status}</Badge></td>
                      <td className="px-6 py-3 text-right font-mono font-semibold">{formatINR(Number(q.total_amount))}</td>
                      <td className="px-6 py-3 text-right">
                        <Button asChild size="sm" variant="ghost"><Link to={`/quotations/${q.id}`}><Eye className="h-4 w-4" /></Link></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
