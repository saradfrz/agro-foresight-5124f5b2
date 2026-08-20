import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CommodityIcon } from "@/components/CommodityIcon";
import { SubmitPriceDialog } from "@/components/SubmitPriceDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  accentVar,
  formatBRL,
  formatDate,
  harvestLabel,
  isInHarvest,
  pctChange,
  type Commodity,
  type Price,
} from "@/lib/agro";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AgroTicker" },
      {
        name: "description",
        content: "Live soybean, corn, cotton and sugarcane prices with 30 and 90 day trends.",
      },
      { property: "og:title", content: "Dashboard — AgroTicker" },
      { property: "og:description", content: "Live Brazilian commodity prices and trends." },
    ],
  }),
  component: Dashboard,
});

type Row = { commodity: Commodity; prices: Price[] };

function Dashboard() {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<30 | 90>(30);
  const [live, setLive] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-prices"],
    queryFn: async () => {
      const [{ data: commodities, error: cErr }, { data: prices, error: pErr }] = await Promise.all([
        supabase.from("commodities").select("*").order("name"),
        supabase
          .from("commodity_prices")
          .select("id, commodity_id, price, price_date, source")
          .gte(
            "price_date",
            new Date(Date.now() - 100 * 86400000).toISOString().slice(0, 10),
          )
          .order("price_date", { ascending: true }),
      ]);
      if (cErr) throw cErr;
      if (pErr) throw pErr;
      return (commodities as Commodity[]).map((commodity) => ({
        commodity,
        prices: ((prices ?? []) as Price[])
          .filter((p) => p.commodity_id === commodity.id)
          .map((p) => ({ ...p, price: Number(p.price) })),
      })) satisfies Row[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("commodity-prices-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commodity_prices" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-prices"] });
          queryClient.invalidateQueries({ queryKey: ["price-history"] });
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Market dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reference prices for Brazil's four mechanized crops.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-2">
            <Radio className={live ? "size-3 text-gain" : "size-3 text-muted-foreground"} />
            {live ? "Live" : "Connecting"}
          </Badge>
          <div className="flex rounded-md border border-border p-0.5">
            {([30, 90] as const).map((r) => (
              <Button
                key={r}
                size="sm"
                variant={range === r ? "secondary" : "ghost"}
                onClick={() => setRange(r)}
              >
                {r}d
              </Button>
            ))}
          </div>
          <SubmitPriceDialog commodities={(data ?? []).map((r) => r.commodity)} />
        </div>
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading prices…</p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(data ?? []).map(({ commodity, prices }) => {
              const latest = prices[prices.length - 1];
              const previous = prices[prices.length - 2];
              const change = latest && previous ? pctChange(latest.price, previous.price) : 0;
              const up = change >= 0;
              const inSeason = isInHarvest(
                commodity.harvest_start_month,
                commodity.harvest_end_month,
              );
              return (
                <div key={commodity.id} className="panel p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <CommodityIcon slug={commodity.slug} accent={commodity.accent} />
                      <div>
                        <h2 className="font-semibold leading-tight">{commodity.name}</h2>
                        <p className="text-xs text-muted-foreground">{commodity.unit}</p>
                      </div>
                    </div>
                    {inSeason ? (
                      <Badge variant="secondary" className="bg-gain/12 text-gain">
                        Harvest
                      </Badge>
                    ) : null}
                  </div>
                  <p className="tabular mt-5 text-3xl font-medium">
                    {latest ? formatBRL(latest.price) : "—"}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span
                      className="tabular flex items-center gap-1"
                      style={{ color: up ? "var(--gain)" : "var(--loss)" }}
                    >
                      {up ? (
                        <ArrowUpRight className="size-4" />
                      ) : (
                        <ArrowDownRight className="size-4" />
                      )}
                      {change.toFixed(2)}%
                    </span>
                    <span className="tabular text-muted-foreground">
                      {latest ? formatDate(latest.price_date) : ""}
                    </span>
                  </div>
                  <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    {inSeason ? "In season" : "Off season"} · harvest{" "}
                    {harvestLabel(commodity.harvest_start_month, commodity.harvest_end_month)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {(data ?? []).map(({ commodity, prices }) => {
              const series = prices.slice(-range);
              return (
                <div key={commodity.id} className="panel p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">
                      {commodity.name}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        · last {range} days
                      </span>
                    </h2>
                    <span className="tabular text-xs text-muted-foreground">{commodity.unit}</span>
                  </div>
                  <div className="mt-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series} margin={{ left: -12, right: 8, top: 8 }}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="price_date"
                          tickFormatter={(v: string) => v.slice(5)}
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          stroke="var(--border)"
                          minTickGap={24}
                        />
                        <YAxis
                          domain={["auto", "auto"]}
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          stroke="var(--border)"
                          width={56}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--popover-foreground)",
                          }}
                          labelFormatter={(v) => formatDate(String(v))}
                          formatter={(v) => [formatBRL(Number(v)), commodity.name]}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={accentVar[commodity.accent] ?? "var(--soy)"}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
