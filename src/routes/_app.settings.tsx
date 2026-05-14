import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { loadCompany, saveCompany } from "@/lib/company";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [c, setC] = useState(loadCompany());

  function onLogo(file: File) {
    const reader = new FileReader();
    reader.onload = () => setC((p) => ({ ...p, logo_url: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-sm text-muted-foreground">These details appear on every quotation PDF.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-white p-2">
              {c.logo_url ? <img src={c.logo_url} alt="logo" className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted-foreground">No logo</span>}
            </div>
            <div>
              <Label>Logo</Label>
              <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
              <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, or SVG. Saved locally to your browser.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Company Name</Label><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></div>
            <div><Label>Tagline</Label><Input value={c.tagline} onChange={(e) => setC({ ...c, tagline: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></div>
            <div><Label>Website</Label><Input value={c.website} onChange={(e) => setC({ ...c, website: e.target.value })} /></div>
            <div><Label>GST Number</Label><Input value={c.gst_number} onChange={(e) => setC({ ...c, gst_number: e.target.value })} placeholder="e.g., 33AABCT1234H1Z0" /></div>
            <div className="md:col-span-2"><Label>Address</Label><Textarea rows={2} value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} /></div>
          </div>
          <Button onClick={() => { saveCompany(c); toast.success("Settings saved"); }}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
