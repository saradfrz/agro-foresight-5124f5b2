import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Activity, Table2, BookOpen } from "lucide-react";
import heroImage from "@/assets/hero-fields.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CommodityIcon } from "@/components/CommodityIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { harvestLabel, isInHarvest, type Commodity } from "@/lib/agro";

const title = "AgroTicker — near real-time Brazilian commodity prices";
const description =
  "Track soybean, corn, cotton and sugarcane reference prices for Brazil's mechanized crops, with live dashboards, harvest seasons and exportable history.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Activity,
    title: "Live price cards",
    body: "Dashboard cards stream new entries as they land in the database — no refresh, no polling.",
  },
  {
    icon: Table2,
    title: "Filter and export",
    body: "Slice the full history by crop, date and price band, then export exactly what you filtered to CSV.",
  },
  {
    icon: BookOpen,
    title: "Market context",
    body: "Editorial pages explain how each Brazilian market actually forms its price — basis, premiums, formulas.",
  },
];

function Landing() {
  const { session } = useAuth();
  const { data: commodities } = useQuery({
    queryKey: ["commodities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commodities")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Commodity[];
    },
  });

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <img
          src={heroImage}
          alt="Aerial view of soybean and corn fields in the Brazilian Cerrado at sunset"
          width={1600}
          height={912}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/92 to-background/40" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 lg:py-28">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-5 gap-2">
              <span className="size-2 animate-pulse rounded-full bg-gain" />
              Live reference prices
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Price intelligence for Brazil's mechanized crops.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              AgroTicker tracks soybean, corn, cotton and sugarcane reference prices in near real
              time — trend charts, harvest-season context and a filterable history you can export.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={session ? "/dashboard" : "/register"}>
                  {session ? "Open dashboard" : "Create free account"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to={session ? "/prices" : "/auth"}>
                  {session ? "Browse price history" : "Log in"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">Four crops, one ticker</h2>
            <p className="mt-1 text-muted-foreground">
              The commodities that drive Brazilian mechanized agriculture.
            </p>
          </div>
          <Button asChild variant="ghost">
            <Link to="/commodities">
              Read the market guides <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(commodities ?? []).map((c) => {
            const inSeason = isInHarvest(c.harvest_start_month, c.harvest_end_month);
            return (
              <Link
                key={c.id}
                to="/commodities/$slug"
                params={{ slug: c.slug }}
                className="panel group flex flex-col gap-4 p-5 transition-shadow hover:shadow-lift"
              >
                <div className="flex items-start justify-between">
                  <CommodityIcon slug={c.slug} accent={c.accent} />
                  {inSeason ? (
                    <Badge className="bg-gain/12 text-gain" variant="secondary">
                      In harvest
                    </Badge>
                  ) : null}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">{c.name_pt}</p>
                </div>
                <dl className="mt-auto space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Quoted in</dt>
                    <dd className="tabular">{c.unit}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Harvest</dt>
                    <dd className="tabular">
                      {harvestLabel(c.harvest_start_month, c.harvest_end_month)}
                    </dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="field-grid border-t border-border bg-secondary/30">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-16 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="panel p-6">
              <f.icon className="size-5 text-primary" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold">Start tracking today's board</h2>
        <p className="mt-3 text-muted-foreground">
          Create an account to unlock the live dashboard, 90-day trend charts and CSV exports.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to={session ? "/dashboard" : "/register"}>
              {session ? "Go to dashboard" : "Sign up free"}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/commodities">Explore commodities</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
