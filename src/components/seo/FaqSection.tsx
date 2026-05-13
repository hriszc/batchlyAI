import type { FaqItem } from "@/lib/seo/geo-content";

interface FaqSectionProps {
  title?: string;
  description?: string;
  items: FaqItem[];
}

export function FaqSection({
  title = "Frequently asked questions",
  description,
  items,
}: FaqSectionProps) {
  return (
    <section className="mt-14 border-t pt-10">
      <div className="max-w-[720px]">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="mt-6 divide-y rounded-lg border bg-card">
        {items.map((item) => (
          <details key={item.question} className="group p-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left font-medium text-foreground">
              <span>{item.question}</span>
              <span className="mt-0.5 text-lg leading-none text-muted-foreground group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 max-w-[760px] text-sm leading-6 text-muted-foreground">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
