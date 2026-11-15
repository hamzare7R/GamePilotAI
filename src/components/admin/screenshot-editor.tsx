"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { ImagePreview } from "@/components/admin/image-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IMAGE_URL_HINT,
  MAX_IMAGE_URL_LENGTH,
  MAX_SCREENSHOTS,
  validateImageUrl,
} from "@/lib/image-url";

type ScreenshotEditorProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export function ScreenshotEditor({ value, onChange }: ScreenshotEditorProps) {
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const addScreenshots = () => {
    const candidates = draft
      .split(/[\s,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (candidates.length === 0) return;

    const next = [...value];
    const problems: string[] = [];

    for (const candidate of candidates) {
      if (next.length >= MAX_SCREENSHOTS) {
        problems.push(`You can add up to ${MAX_SCREENSHOTS} screenshots.`);
        break;
      }
      const check = validateImageUrl(candidate);
      if (!check.ok) {
        problems.push(check.message);
        continue;
      }
      if (next.includes(candidate)) {
        problems.push("That screenshot is already in the list.");
        continue;
      }
      next.push(candidate);
    }

    if (next.length !== value.length) onChange(next);
    setMessage(problems[0] ?? null);
    if (problems.length === 0) setDraft("");
  };

  const removeScreenshot = (url: string) => {
    onChange(value.filter((entry) => entry !== url));
    setMessage(null);
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <Label htmlFor={inputId}>Screenshots</Label>
        <span className="text-[11px] text-muted-foreground">
          {value.length} / {MAX_SCREENSHOTS}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          maxLength={MAX_IMAGE_URL_LENGTH}
          onChange={(event) => {
            setDraft(event.target.value);
            setMessage(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addScreenshots();
            }
          }}
          placeholder="https://example.com/screenshot.jpg"
          aria-describedby={`${inputId}-hint`}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={addScreenshots}
          disabled={!draft.trim() || value.length >= MAX_SCREENSHOTS}
          className="shrink-0"
        >
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>

      <p id={`${inputId}-hint`} className="text-[11px] text-muted-foreground">
        Paste one URL, or several separated by spaces/commas. {IMAGE_URL_HINT}
      </p>

      {message ? (
        <p className="text-[11px] text-destructive" role="alert">
          {message}
        </p>
      ) : null}

      {value.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {value.map((url, index) => (
            <li
              key={url}
              className="flex items-start gap-2 rounded-lg border border-border/70 bg-background/40 p-2"
            >
              <ImagePreview
                src={url}
                alt={`Screenshot ${index + 1} preview`}
                aspect="screenshot"
                showStatus={false}
                className="w-28 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[11px] font-medium">Screenshot {index + 1}</p>
                <p className="line-clamp-2 break-all text-[10px] text-muted-foreground">{url}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeScreenshot(url)}
                aria-label={`Remove screenshot ${index + 1}`}
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-[11px] text-muted-foreground">
          No screenshots yet. The details view will simply omit the gallery.
        </p>
      )}
    </div>
  );
}
