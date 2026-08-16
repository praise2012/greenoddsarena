import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Lock, MessageCircle, Share2, ShieldCheck, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { ACCESS_DAYS, ACCESS_FEE, SITE_NAME } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GREEN ODDS ARENA — Daily SportyBet Booking Codes" },
      {
        name: "description",
        content:
          "Get verified daily SportyBet booking codes from GREEN ODDS ARENA. Unlock 10 days of VIP access for ₦1,500 and join the winning arena.",
      },
      { property: "og:title", content: "GREEN ODDS ARENA — Daily SportyBet Booking Codes" },
      {
        property: "og:description",
        content: "Verified SportyBet codes posted daily. 10 days of VIP access for ₦1,500.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, hasAccess } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-5 py-5 sm:px-10">
        <span className="text-lg font-extrabold tracking-tight text-primary">{SITE_NAME}</span>
        <div className="flex gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link to="/codes">Enter Arena</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link to="/auth">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Sign up
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-5 py-16 text-center sm:py-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            <Flame className="h-3.5 w-3.5" /> SportyBet VIP codes
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground sm:text-6xl">
            Win green. <span className="text-primary">Every single day.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {SITE_NAME} is a private arena where our admin drops hand-built SportyBet booking codes.
            Unlock access for ₦{ACCESS_FEE.toLocaleString()} and enjoy {ACCESS_DAYS} full days of
            codes, likes, comments and sharing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to={user ? (hasAccess ? "/codes" : "/unlock") : "/auth"}>
                {user ? (hasAccess ? "View today's codes" : "Unlock access") : "Create free account"}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, title: "Admin-only codes", text: "Only the super admin posts codes. No noise, no fake tipsters." },
            { icon: Lock, title: "₦1,500 / 10 days", text: "Pay once, enjoy 10 days. Renew anytime to stay active." },
            { icon: ThumbsUp, title: "Like what wins", text: "Show love to the codes that banked for you." },
            { icon: MessageCircle, title: "Comment & share", text: "Talk with the arena and share codes anywhere." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="mt-3 font-bold text-card-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-3xl px-5 pb-24 text-center">
          <Share2 className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 text-2xl font-bold">Ready to enter the arena?</h2>
          <p className="mt-2 text-muted-foreground">
            Create your account with email and password, pay ₦{ACCESS_FEE.toLocaleString()}, and get
            instant access once approved.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE_NAME} · 18+ · Bet responsibly.
      </footer>
    </div>
  );
}
