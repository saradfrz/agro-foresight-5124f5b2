export type Commodity = {
  id: string;
  slug: string;
  name: string;
  name_pt: string;
  unit: string;
  harvest_start_month: number;
  harvest_end_month: number;
  accent: string;
};

export type Price = {
  id: string;
  commodity_id: string;
  price: number;
  price_date: string;
  source: string;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function monthName(month: number) {
  return MONTHS[(month - 1 + 12) % 12];
}

export function isInHarvest(start: number, end: number, date = new Date()) {
  const m = date.getUTCMonth() + 1;
  return start <= end ? m >= start && m <= end : m >= start || m <= end;
}

export function harvestLabel(start: number, end: number) {
  return `${monthName(start)}–${monthName(end)}`;
}

export const accentVar: Record<string, string> = {
  soy: "var(--soy)",
  corn: "var(--corn)",
  cotton: "var(--cotton)",
  cane: "var(--cane)",
};

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function pctChange(latest: number, previous: number) {
  if (!previous) return 0;
  return ((latest - previous) / previous) * 100;
}

export function toCsv(rows: Record<string, string | number>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const s = String(value ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
