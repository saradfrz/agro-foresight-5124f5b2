import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  downloadCsv,
  formatBRL,
  formatDate,
  toCsv,
  type Commodity,
  type Price,
} from "@/lib/agro";

export const Route = createFileRoute("/_authenticated/prices")({
  head: () => ({
    meta: [
      { title: "Price history — AgroTicker" },
      {
        name: "description",
        content: "Filter the full Brazilian commodity price history and export it to CSV.",
      },
      { property: "og:title", content: "Price history — AgroTicker" },
      {
        property: "og:description",
        content: "Filter Brazilian commodity price history by crop, date and price band.",
      },
    ],
  }),
  component: PriceHistory,
});

type JoinedPrice = Price & { commodity: string; unit: string };

function PriceHistory() {
  const [commoditySlug, setCommoditySlug] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["price-history"],
    queryFn: async () => {
      const [{ data: commodities, error: cErr }, { data: prices, error: pErr }] = await Promise.all([
        supabase.from("commodities").select("*").order("name"),
        supabase
          .from("commodity_prices")
          .select("id, commodity_id, price, price_date, source")
          .order("price_date", { ascending: false })
          .limit(2000),
      ]);
      if (cErr) throw cErr;
      if (pErr) throw pErr;
      const list = commodities as Commodity[];
      const bySlug = new Map(list.map((c) => [c.id, c]));
      const rows: JoinedPrice[] = ((prices ?? []) as Price[]).map((p) => ({
        ...p,
        price: Number(p.price),
        commodity: bySlug.get(p.commodity_id)?.name ?? "—",
        unit: bySlug.get(p.commodity_id)?.unit ?? "",
      }));
      return { commodities: list, rows };
    },
  });

  const commodities = data?.commodities ?? [];
  const selected = commodities.find((c) => c.slug === commoditySlug);

  const filtered = useMemo(() => {
    return (data?.rows ?? []).filter((row) => {
      if (selected && row.commodity_id !== selected.id) return false;
      if (from && row.price_date < from) return false;
      if (to && row.price_date > to) return false;
      if (minPrice && row.price < Number(minPrice)) return false;
      if (maxPrice && row.price > Number(maxPrice)) return false;
      return true;
    });
  }, [data?.rows, selected, from, to, minPrice, maxPrice]);

  function exportCsv() {
    const csv = toCsv(
      filtered.map((row) => ({
        date: row.price_date,
        commodity: row.commodity,
        price: row.price.toFixed(2),
        unit: row.unit,
        source: row.source,
      })),
    );
    if (!csv) return;
    downloadCsv(`agroticker-prices-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Price history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length.toLocaleString("pt-BR")} records match your filters.
          </p>
        </div>
        <Button onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="size-4" /> Export to CSV
        </Button>
      </div>

      <div className="panel mt-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label>Commodity</Label>
          <Select value={commoditySlug} onValueChange={setCommoditySlug}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All commodities</SelectItem>
              {commodities.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="min">Min price</Label>
          <Input
            id="min"
            type="number"
            step="0.01"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max">Max price</Label>
          <Input
            id="max"
            type="number"
            step="0.01"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="999.00"
          />
        </div>
      </div>

      <div className="panel mt-6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Commodity</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Loading records…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No records match these filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(0, 500).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="tabular">{formatDate(row.price_date)}</TableCell>
                  <TableCell className="font-medium">{row.commodity}</TableCell>
                  <TableCell className="tabular text-right">{formatBRL(row.price)}</TableCell>
                  <TableCell className="text-muted-foreground">{row.unit}</TableCell>
                  <TableCell className="text-muted-foreground">{row.source}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {filtered.length > 500 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing the 500 most recent of {filtered.length.toLocaleString("pt-BR")} filtered records.
          The CSV export includes all of them.
        </p>
      ) : null}
    </div>
  );
}
