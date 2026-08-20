import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CommodityIcon } from "@/components/CommodityIcon";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { harvestLabel, isInHarvest, type Commodity } from "@/lib/agro";

export const Route = createFileRoute("/commodities/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("commodities")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { commodity: data as Commodity };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Commodity unavailable — AgroTicker" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.commodity.name} market in Brazil — AgroTicker`;
    const description = `How the Brazilian ${loaderData.commodity.name.toLowerCase()} market works: pricing basis, harvest window (${harvestLabel(loaderData.commodity.harvest_start_month, loaderData.commodity.harvest_end_month)}) and market drivers.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">This guide didn't load</h1>
      <p className="mt-2 text-muted-foreground">Please try again in a moment.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Commodity not found</h1>
      <Button asChild className="mt-6">
        <Link to="/commodities">Back to commodities</Link>
      </Button>
    </div>
  ),
  component: CommodityPage,
});

type Content = {
  id: string;
  commodity_id: string;
  title: string;
  body: string;
  market_notes: string;
  updated_at: string;
};

function CommodityPage() {
  const { commodity } = Route.useLoaderData();
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", body: "", market_notes: "" });
  const [busy, setBusy] = useState(false);

  const { data: content } = useQuery({
    queryKey: ["commodity-content", commodity.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commodity_content")
        .select("*")
        .eq("commodity_id", commodity.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Content | null;
    },
  });

  useEffect(() => {
    if (content) {
      setDraft({
        title: content.title,
        body: content.body,
        market_notes: content.market_notes,
      });
    }
  }, [content]);

  async function save() {
    if (!user) return;
    setBusy(true);
    const payload = { ...draft, updated_by: user.id };
    const { error } = content
      ? await supabase.from("commodity_content").update(payload).eq("id", content.id)
      : await supabase
          .from("commodity_content")
          .insert({ ...payload, commodity_id: commodity.id });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Content saved.");
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["commodity-content", commodity.id] });
    queryClient.invalidateQueries({ queryKey: ["commodity-guides"] });
  }

  const inSeason = isInHarvest(commodity.harvest_start_month, commodity.harvest_end_month);

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link
        to="/commodities"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All commodities
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <CommodityIcon slug={commodity.slug} accent={commodity.accent} className="size-12" />
          <div>
            <h1 className="text-3xl font-semibold">
              {content?.title ?? `${commodity.name} in Brazil`}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{commodity.name_pt}</span>
              <span aria-hidden>·</span>
              <span className="tabular">{commodity.unit}</span>
              <span aria-hidden>·</span>
              <span className="tabular">
                Harvest {harvestLabel(commodity.harvest_start_month, commodity.harvest_end_month)}
              </span>
              {inSeason ? (
                <Badge variant="secondary" className="bg-gain/12 text-gain">
                  In harvest now
                </Badge>
              ) : null}
            </p>
          </div>
        </div>
        {isAdmin ? (
          editing ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={busy}>
                <Save className="size-4" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="size-4" /> Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
          )
        ) : null}
      </header>

      {editing ? (
        <div className="panel mt-8 space-y-5 p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <RichTextEditor
              value={draft.body}
              onChange={(body) => setDraft({ ...draft, body })}
              minHeight={280}
            />
          </div>
          <div className="space-y-2">
            <Label>Market notes</Label>
            <RichTextEditor
              value={draft.market_notes}
              onChange={(market_notes) => setDraft({ ...draft, market_notes })}
              minHeight={140}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-5 text-base leading-relaxed">
            {(content?.body ?? "").split(/\n{2,}/).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          {content?.market_notes ? (
            <aside className="panel mt-10 border-l-4 border-l-accent p-6">
              <h2 className="text-lg font-semibold">Market notes</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {content.market_notes}
              </p>
            </aside>
          ) : null}

          {content ? (
            <p className="mt-8 text-xs text-muted-foreground">
              Last updated {new Date(content.updated_at).toLocaleDateString("pt-BR")}
            </p>
          ) : (
            <p className="mt-8 text-sm text-muted-foreground">
              No content published for this commodity yet.
            </p>
          )}
        </>
      )}
    </article>
  );
}
