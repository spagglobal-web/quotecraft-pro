import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, IndianRupee, Package, Plus, TrendingUp } from "lucide-react";
import { formatINR } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";

function statColor(s: string) {
  if (s === "approved") return "bg-success text-success-foreground";
  if (s === "sent") return "bg-primary text-primary-foreground";
  return "bg-muted text-muted-foreground";
}

export default function Dashboard() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [modelCount, setModelCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: q }, { data: m }] = await Promise.all([
        supabase.from("quotations").select("id, quotation_number, total_amount, status, created_at, customer_id").order("created_at", { ascending: false }).limit(50),
        supabase.from("purifier_models").select("id").eq("active", true),
      ]);
      setQuotations(q ?? []);
      setModelCount(m?.length ?? 0);
    })();
  }, []);

  const totalValue = quotations.reduce((s, q) => s + Number(q.total_amount || 0), 0);
  const approved = quotations.filter((q) => q.status === "approved").length;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back. Here's a snapshot of your quotation activity.</p>
        </div>
        <Button asChild size="lg" className="shadow-[var(--shadow-elegant)]">
          <Link to="/quotations/new"><Plus className="mr-2 h-4 w-4" /> New Quotation</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={FileText} label="Total Quotations" value={String(quotations.length)} />
        <StatCard icon={TrendingUp} label="Approved" value={String(approved)} />
        <StatCard icon={IndianRupee} label="Pipeline Value" value={formatINR(totalValue)} />
        <StatCard icon={Package} label="Active Products" value={String(modelCount)} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Quotations</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link to="/quotations">View all</Link></Button>
        </CardHeader>
        <CardContent>
          {quotations.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <p className="text-sm text-muted-foreground">No quotations yet.</p>
              <Button asChild className="mt-4"><Link to="/quotations/new">Create your first quotation</Link></Button>
            </div>
          ) : (
            <div className="divide-y">
              {quotations.slice(0, 8).map((q) => (
                <Link key={q.id} to={`/quotations/${q.id}`} className="flex items-center justify-between gap-4 py-3 transition hover:bg-accent/40 -mx-2 px-2 rounded-md">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{q.quotation_number}</div>
                      <div className="text-xs text-muted-foreground">{new Date(q.created_at).toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={statColor(q.status)} variant="secondary">{q.status}</Badge>
                    <div className="font-mono text-sm font-semibold">{formatINR(Number(q.total_amount))}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-elegant)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="truncate text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
