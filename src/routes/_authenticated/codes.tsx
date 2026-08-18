import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Heart, Lock, MessageCircle, Send, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { ACCESS_FEE } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/codes")({
  head: () => ({
    meta: [
      { title: "Today's Codes · GREEN ODDS ARENA" },
      { name: "description", content: "View, like, comment on and share today's SportyBet booking codes." },
      { property: "og:title", content: "Today's Codes · GREEN ODDS ARENA" },
      { property: "og:description", content: "Verified SportyBet booking codes for active members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CodesPage,
});

type Code = {
  id: string;
  title: string;
  booking_code: string;
  bookmaker: string;
  market: string | null;
  total_odds: number | null;
  description: string | null;
  image_url: string | null;
  kickoff_at: string | null;
  created_at: string;
};

type Comment = {
  id: string;
  code_id: string;
  user_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
};

function CodesPage() {
  const { hasAccess, user, isAdmin, profile } = useAuth();
  const [codes, setCodes] = useState<Code[]>([]);
  const [likes, setLikes] = useState<{ code_id: string; user_id: string }[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: c }, { data: l }, { data: cm }] = await Promise.all([
      supabase.from("codes").select("*").order("created_at", { ascending: false }),
      supabase.from("code_likes").select("code_id,user_id"),
      supabase.from("code_comments").select("*").order("created_at", { ascending: true }),
    ]);
    setCodes((c as Code[]) ?? []);
    setLikes(l ?? []);
    setComments((cm as Comment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (hasAccess) void load();
    else setLoading(false);
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <Lock className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-2xl font-bold">Your access is not active</h1>
        <p className="mt-2 text-muted-foreground">
          Pay ₦{ACCESS_FEE.toLocaleString()} to unlock 10 days of codes.
        </p>
        <Button asChild className="mt-6" size="lg">
          <Link to="/unlock">Unlock access</Link>
        </Button>
      </div>
    );
  }

  const toggleLike = async (codeId: string) => {
    if (!user) return;
    const liked = likes.some((l) => l.code_id === codeId && l.user_id === user.id);
    if (liked) {
      await supabase.from("code_likes").delete().eq("code_id", codeId).eq("user_id", user.id);
    } else {
      await supabase.from("code_likes").insert({ code_id: codeId, user_id: user.id });
    }
    void load();
  };

  const addComment = async (codeId: string) => {
    const content = (draft[codeId] ?? "").trim();
    if (!content || !user) return;
    const { error } = await supabase.from("code_comments").insert({
      code_id: codeId,
      user_id: user.id,
      author_name: profile?.display_name ?? profile?.email ?? null,
      content,
    });
    if (error) { toast.error(error.message); return; }
    setDraft((d) => ({ ...d, [codeId]: "" }));
    void load();
  };

  const deleteComment = async (id: string) => {
    await supabase.from("code_comments").delete().eq("id", id);
    void load();
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

  const shareCode = async (code: Code) => {
    const text = `🔥💚 GREEN ODDS ARENA\n${code.title}\n${code.bookmaker} code: ${code.booking_code}${
      code.total_odds ? `\nOdds: ${code.total_odds}` : ""
    }${code.market ? `\nMarket: ${code.market}` : ""}`;
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title: "GREEN ODDS ARENA", text, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast.success("Code copied — paste it anywhere to share");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-black tracking-tight">Today&apos;s booking codes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap a code to copy it, then load it on SportyBet.
      </p>

      {loading && <p className="mt-10 text-muted-foreground">Loading codes...</p>}
      {!loading && codes.length === 0 && (
        <p className="mt-10 rounded-xl border border-border bg-card p-6 text-muted-foreground">
          No codes posted yet. Check back shortly 🔥
        </p>
      )}

      <div className="mt-6 space-y-5">
        {codes.map((code) => {
          const codeLikes = likes.filter((l) => l.code_id === code.id);
          const liked = codeLikes.some((l) => l.user_id === user?.id);
          const codeComments = comments.filter((c) => c.code_id === code.id);
          return (
            <article key={code.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold">{code.title}</h2>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {code.bookmaker}
                    {code.market ? ` · ${code.market}` : ""}
                    {code.total_odds ? ` · ${code.total_odds} odds` : ""} ·{" "}
                    {new Date(code.created_at).toLocaleString()}
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      await supabase.from("codes").delete().eq("id", code.id);
                      void load();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {code.image_url && (
                <button
                  type="button"
                  onClick={() => copyCode(code.booking_code)}
                  className="mt-4 block w-full overflow-hidden rounded-xl border border-border"
                >
                  <img
                    src={code.image_url}
                    alt={`${code.title} code screenshot`}
                    className="w-full object-contain"
                  />
                </button>
              )}

              <button
                type="button"
                onClick={() => copyCode(code.booking_code)}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-left"
              >
                <span className="font-mono text-xl font-bold tracking-widest text-primary">
                  {code.booking_code}
                </span>
                <Copy className="h-4 w-4 text-primary" />
              </button>

              {code.description && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {code.description}
                </p>
              )}
              {code.kickoff_at && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Kickoff: {new Date(code.kickoff_at).toLocaleString()}
                </p>
              )}

              <div className="mt-4 flex items-center gap-4 text-sm">
                <button
                  onClick={() => toggleLike(code.id)}
                  className={`flex items-center gap-1.5 ${liked ? "text-primary" : "text-muted-foreground"}`}
                >
                  <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {codeLikes.length}
                </button>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageCircle className="h-4 w-4" /> {codeComments.length}
                </span>
                <button
                  onClick={() => shareCode(code)}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary"
                >
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {codeComments.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-2 rounded-lg bg-secondary px-3 py-2">
                    <p className="text-sm">
                      <span className="font-semibold text-primary">{c.author_name ?? "Member"}: </span>
                      {c.content}
                    </p>
                    {(c.user_id === user?.id || isAdmin) && (
                      <button onClick={() => deleteComment(c.id)} className="text-muted-foreground">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={draft[code.id] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [code.id]: e.target.value }))}
                    placeholder="Add a comment..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void addComment(code.id);
                    }}
                  />
                  <Button size="icon" onClick={() => addComment(code.id)}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
