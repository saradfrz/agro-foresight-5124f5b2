import { Sprout, Wheat, Flower2, Leaf } from "lucide-react";
import { accentVar } from "@/lib/agro";
import { cn } from "@/lib/utils";

const icons = {
  soybean: Sprout,
  corn: Wheat,
  cotton: Flower2,
  sugarcane: Leaf,
} as const;

export function CommodityIcon({
  slug,
  accent,
  className,
}: {
  slug: string;
  accent?: string;
  className?: string;
}) {
  const Icon = icons[slug as keyof typeof icons] ?? Sprout;
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-md",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklab, ${accentVar[accent ?? "soy"]} 14%, transparent)`,
        color: accentVar[accent ?? "soy"],
      }}
    >
      <Icon className="size-5" strokeWidth={2} aria-hidden />
    </span>
  );
}
