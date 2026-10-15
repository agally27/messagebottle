import { cn } from "@/lib/utils/cn";

/** Renders story text with paragraph and line breaks preserved. */
export function StoryText({ text, className, verse }: { text: string; className?: string; verse?: boolean }) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={cn("space-y-4", className)}>
      {paragraphs.map((p, i) => (
        <p key={i} className={cn(verse && "whitespace-pre-line")}>
          {p.split("\n").map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
