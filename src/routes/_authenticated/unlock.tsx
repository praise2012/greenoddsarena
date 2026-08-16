import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { ACCESS_DAYS, ACCESS_FEE, BANK_DETAILS } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/unlock")({
  head: () => ({
    meta: [
      { title: "Unlock Access · GREEN ODDS ARENA" },
      { name: "description", content: "Pay ₦1,500 to unlock 10 days of SportyBet booking codes." },
      { property: "og:title", content: "Unlock Access · GREEN ODDS ARENA" },
      { property: "og:description", content: "₦1,500 unlocks 10 days of VIP SportyBet codes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UnlockPage,
});

type Payment = {
  id: string;
  amount: number;
  sender_name: string;
  reference: string | null;
  status: string;
  created_at: string;
};

function UnlockPage() {
  const { user, profile, hasAccess, isAdmin, refresh } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sender, setSender] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("payments")
      .select("id,amount,sender_name,reference,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPayments((data as Payment[]) ?? []);
  };

  useEffect(() => {
    void load();
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      amount: ACCESS_FEE,
      sender_name: sender.trim(),
      reference: reference.trim() || null,
      note: note.trim() || null,
      status: "pending",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Payment submitted — admin will confirm shortly");
    setSender("");
    setReference("");
    setNote("");
    void load();
  };

  const expires = profile?.access_expires_at ? new Date(profile.access_expires_at) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-black tracking-tight">Access & payment</h1>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5">
        {isAdmin ? (
          <p className="flex items-center gap-2 font-semibold text-primary">
            <CheckCircle2 className="h-5 w-5" /> Super admin — unlimited access
          </p>
        ) : hasAccess ? (
          <p className="flex items-center gap-2 font-semibold text-primary">
            <CheckCircle2 className="h-5 w-5" /> Active until {expires?.toLocaleString()}
          </p>
        ) : (
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <Clock className="h-5 w-5" /> Inactive — pay ₦{ACCESS_FEE.toLocaleString()} to activate{" "}
            {ACCESS_DAYS} days
          </p>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold">Step 1 — Send ₦{ACCESS_FEE.toLocaleString()}</h2>
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-muted-foreground">Bank: <span className="text-foreground">{BANK_DETAILS.bank}</span></p>
          <p className="text-muted-foreground">
            Account name: <span className="text-foreground">{BANK_DETAILS.accountName}</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Account number:</span>
            <span className="font-mono text-lg font-bold text-primary">{BANK_DETAILS.accountNumber}</span>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(BANK_DETAILS.accountNumber);
                toast.success("Account number copied");
              }}
            >
              <Copy className="h-4 w-4 text-primary" />
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold">Step 2 — Submit your payment details</h2>
        <div className="space-y-2">
          <Label htmlFor="sender">Name used for the transfer</Label>
          <Input id="sender" required value={sender} onChange={(e) => setSender(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ref">Transaction reference (optional)</Label>
          <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Submitting..." : "I have paid ₦" + ACCESS_FEE.toLocaleString()}
        </Button>
      </form>

      <h2 className="mt-8 font-bold">Your payments</h2>
      <div className="mt-3 space-y-2">
        {payments.length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
        {payments.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <div>
              <p className="font-medium">₦{Number(p.amount).toLocaleString()} · {p.sender_name}</p>
              <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                p.status === "approved"
                  ? "bg-primary/15 text-primary"
                  : p.status === "rejected"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
