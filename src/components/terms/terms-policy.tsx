"use client";

import { useState } from "react";
import { CalendarDays, Globe } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { termsContent, type TermsBlock, type TermsLocale } from "./terms-content";

const locales: TermsLocale[] = ["de", "en"];
const localeLabels: Record<TermsLocale, string> = { de: "Deutsch", en: "English" };

function BlockList({ block }: { block: TermsBlock }) {
  if (block.kind === "paragraph") {
    return <p className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>;
  }

  if (block.kind === "list") {
    return (
      <ul className="ml-4 flex list-disc flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground marker:text-primary/70">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.kind === "group") {
    return (
      <div className="space-y-2">
        <h3 className="font-display text-sm font-semibold text-foreground">{block.title}</h3>
        {block.text ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>
        ) : null}
        {block.items ? (
          <ul className="ml-4 flex list-disc flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground marker:text-primary/70">
            {block.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <dl className="grid gap-2 rounded-lg border border-border/60 bg-secondary/30 p-4 text-sm">
      {block.items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="font-medium text-foreground">{item.label}:</dt>
          <dd className="break-words text-muted-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TermsOfService() {
  const [locale, setLocale] = useState<TermsLocale>("de");
  const content = termsContent[locale];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="flex flex-col gap-6 border-b border-border/60 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge variant="outline" className="w-fit">
            GamePilotAI
          </Badge>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {content.documentTitle}
          </h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays aria-hidden="true" className="size-4 text-brand-cyan" />
            {content.updatedLabel}: <span className="text-foreground">{content.updatedAt}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            <Globe aria-hidden="true" className="size-4" />
            {content.switchLabel}
          </span>
          <div
            role="group"
            aria-label={content.switchLabel}
            className="inline-flex rounded-lg border border-border/80 bg-secondary/40 p-1"
          >
            {locales.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={locale === option}
                onClick={() => setLocale(option)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  locale === option
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {localeLabels[option]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
        <nav aria-label={content.tocAriaLabel} className="lg:sticky lg:top-24 lg:self-start">
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {content.tocTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2">
              <ol className="flex flex-col gap-0.5">
                {content.sections.map((section, index) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="flex gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                    >
                      <span className="font-mono text-xs text-brand-cyan">{index + 1}.</span>
                      <span>{section.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </nav>

        <article lang={locale} aria-label={content.sectionsAriaLabel} className="space-y-4">
          {content.sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="scroll-mt-24"
            >
              <Card className="gap-4 py-5">
                <CardHeader className="px-5 sm:px-6">
                  <div className="flex items-baseline gap-3">
                    <span
                      aria-hidden="true"
                      className="font-mono text-sm font-semibold text-brand-cyan"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2
                      id={`${section.id}-heading`}
                      className="font-display text-xl font-semibold tracking-tight"
                    >
                      {section.title}
                    </h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 px-5 sm:px-6">
                  {section.blocks.map((block, blockIndex) => (
                    <BlockList key={blockIndex} block={block} />
                  ))}
                </CardContent>
              </Card>
            </section>
          ))}

          <p className="pt-2 text-center text-xs text-muted-foreground">{content.copyright}</p>
        </article>
      </div>
    </div>
  );
}
