import { useRef } from "react";
import { Bold, Italic, List, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Lightweight contentEditable editor for admin content editing.
 * Stores plain text with paragraph breaks, so reading views stay simple.
 */
export function RichTextEditor({
  value,
  onChange,
  minHeight = 200,
}: {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after = before) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const next = `${value.slice(0, s)}${before}${value.slice(s, e)}${after}${value.slice(e)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, e + before.length);
    });
  }

  return (
    <div className="rounded-md border border-input bg-card">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        <Button type="button" size="sm" variant="ghost" onClick={() => wrap("**")}>
          <Bold className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => wrap("_")}>
          <Italic className="size-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => wrap("\n- ", "")}>
          <List className="size-4" />
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          Blank line = new paragraph
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange(value.trimEnd())}
          title="Trim trailing whitespace"
        >
          <Undo2 className="size-4" />
        </Button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ minHeight }}
        className="w-full resize-y rounded-b-md bg-transparent px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
