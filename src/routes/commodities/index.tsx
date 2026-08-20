import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CommodityIcon } from "@/components/CommodityIcon";
import { Badge } from "@/components/ui/badge";
import { harvestLabel, isInHarvest, type Commodity } from "@/lib/agro";

const title = "Commodity market guides — AgroTicker";
const description =
  "How the soybean, corn, cotton and sugarcane markets actually work in Brazil: pricing basis, premiums, harvest windows and demand drivers.";

export const Route = createFileRoute("/commodities/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: CommoditiesIndex,
});

type ContentRow = { commodity_id: string; title: string; body: string };

function CommoditiesIndex() {
  const { data, isLoading } = useQuery({
    queryKey: ["commodity-guides"],
    queryFn: async () => {
      const [{ data: commodities, error: cErr }, { data: content, error: kErr }] = await Promise.all([
        supabase.from("commodities").select("*").order("name"),
        supabase.from("commodity_content").select("commodity_id, title, body"),
      ]);
      if (cErr) throw cErr;
      if (kErr) throw kErr;
      return {
        commodities: commodities as Commodity[],
        content: (content ?? []) as ContentRow[],
      };
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Commodity market guides</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Each guide explains how that market forms its price in Brazil — from Chicago and ICE
        references to port premiums, freight and the CONSECANA formula.
      </p>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading guides…</p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(data?.commodities ?? []).map((c) => {
            const entry = data?.content.find((k) => k.commodity_id === c.id);
            return (
              <Link
                key={c.id}
                to="/commodities/$slug"
                params={{ slug: c.slug }}
                className="panel flex flex-col gap-4 p-6 transition-shadow hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <CommodityIcon slug={c.slug} accent={c.accent} />
                  {isInHarvest(c.harvest_start_month, c.harvest_end_month) ? (
                    <Badge variant="secondary" className="bg-gain/12 text-gain">
                      In harvest
                    </Badge>
                  ) : (
                    <span className="tabular text-xs text-muted-foreground">
                      Harvest {harvestLabel(c.harvest_start_month, c.harvest_end_month)}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {c.name} · {c.name_pt}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {entry?.body?.slice(0, 220) ?? entry?.title ?? ""}…
                  </p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Read the guide <ArrowRight className="size-4" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
