import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { ACCESS_FEE } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Super Admin · GREEN ODDS ARENA" },
      { name: "description", content: "Post booking codes, approve payments and manage members." },
      { property: "og:title", content: "Super Admin · GREEN ODDS ARENA" },
      { property: "og:description", content: "Admin control panel for GREEN ODDS ARENA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type Payment = {
  id: string;
  user_id: string;
  amount: number;
  sender_name: string;
  reference: string | null;
  note: string | null;
  status: string;
  created_at: string;
};

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  access_expires_at: string | null;
};

const MARKETS = [
  "Football",
  "Basketball",
  "Tennis",
  "Baseball",
  "Ice Hockey",
  "American Football",
  "Cricket",
  "Rugby",
  "Boxing",
  "Esports",
  "Other",
];

function AdminPage() {
  const { isAdmin, user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [form, setForm] = useState({
    title: "",
    booking_code: "",
    bookmaker: "SportyBet",
    market: "Football",
    total_odds: "",
    description: "",
  });
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: pr }] = await Promise.all([
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,email,display_name,access_expires_at"),
    ]);
    setPayments((p as Payment[]) ?? []);
    setProfiles((pr as Profile[]) ?? []);
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  if (!isAdmin) {
    return <p className="px-6 py-20 text-center text-muted-foreground">Admins only.</p>;
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setImageName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const postCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("codes").insert({
      title: form.title.trim(),
      booking_code: form.booking_code.trim().toUpperCase(),
      bookmaker: form.bookmaker.trim() || "SportyBet",
      market: form.market,
      total_odds: form.total_odds ? Number(form.total_odds) : null,
      description: form.description.trim() || null,
      image_url: imageBase64,
      created_by: user.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Code posted 🔥");
    setForm({ title: "", booking_code: "", bookmaker: "SportyBet", market: "Football", total_odds: "", description: "" });
    setImageBase64(null);
    setImageName(null);
  };

  const review = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("payments").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Payment ${status}`);
    void load();
  };

  const nameFor = (uid: string) => {
    const p = profiles.find((x) => x.id === uid);
    return p?.display_name ?? p?.email ?? uid.slice(0, 8);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-black tracking-tight">Super admin panel</h1>

      <Tabs defaultValue="post" className="mt-5">
        <TabsList>
          <TabsTrigger value="post">Post code</TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({payments.filter((p) => p.status === "pending").length})
          </TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="post">
          <form onSubmit={postCode} className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Sunday 10 odds banker"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="code">Booking code</Label>
                <Input
                  id="code"
                  required
                  value={form.booking_code}
                  onChange={(e) => setForm({ ...form, booking_code: e.target.value })}
                  placeholder="ABC123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="odds">Total odds</Label>
                <Input
                  id="odds"
                  type="number"
                  step="0.01"
                  value={form.total_odds}
                  onChange={(e) => setForm({ ...form, total_odds: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bookmaker">Bookmaker</Label>
                <Input
                  id="bookmaker"
                  value={form.bookmaker}
                  onChange={(e) => setForm({ ...form, bookmaker: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Market / sport</Label>
                <Select
                  value={form.market}
                  onValueChange={(v) => setForm({ ...form, market: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a market" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKETS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description / market selection picked</Label>
              <Textarea
                id="desc"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Over 2.5, Both teams to score, Handicap..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Code photo / screenshot</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {imageName && <p className="text-xs text-muted-foreground">Selected: {imageName}</p>}
              {imageBase64 && (
                <img
                  src={imageBase64}
                  alt="Preview"
                  className="mt-2 max-h-48 rounded-xl border border-border object-contain"
                />
              )}
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Posting..." : "Post code"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="payments">
          <div className="space-y-3">
            {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
            {payments.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {nameFor(p.user_id)} · ₦{Number(p.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sender: {p.sender_name}
                      {p.reference ? ` · Ref: ${p.reference}` : ""} ·{" "}
                      {new Date(p.created_at).toLocaleString()}
                    </p>
                    {p.note && <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>}
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                    {p.status}
                  </span>
                </div>
                {p.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => review(p.id, "approved")}>
                      Approve (10 days)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => review(p.id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Access fee: ₦{ACCESS_FEE.toLocaleString()} for 10 days.
            </p>
            {profiles.map((p) => {
              const active = p.access_expires_at && new Date(p.access_expires_at) > new Date();
              return (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{p.display_name ?? p.email}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                  <span className={active ? "text-primary" : "text-muted-foreground"}>
                    {active ? `Active till ${new Date(p.access_expires_at!).toLocaleDateString()}` : "Inactive"}
                  </span>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
