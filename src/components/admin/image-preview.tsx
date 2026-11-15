"use client";

import { useState } from "react";
import { CheckCircle2, ImageOff, Loader2, TriangleAlert } from "lucide-react";

import { CUSTOM_PLACEHOLDER_COVER, CUSTOM_PLACEHOLDER_HERO } from "@/lib/custom-game";
import { cn } from "@/lib/utils";

export type ImagePreviewStatus = "empty" | "loading" | "loaded" | "error" | "invalid";

type ImagePreviewProps = {
  src: string;
  alt: string;
  aspect?: "cover" | "wide" | "screenshot";
  invalid?: boolean;
  /** Hide the caption under the frame (used in compact lists). */
  showStatus?: boolean;
  className?: string;
};

const ASPECT_CLASS: Record<NonNullable<ImagePreviewProps["aspect"]>, string> = {
  cover: "aspect-3/4 max-w-[168px]",
  wide: "aspect-video",
  screenshot: "aspect-video",
};

export function ImagePreview({
  src,
  alt,
  aspect = "cover",
  invalid = false,
  showStatus = true,
  className,
}: ImagePreviewProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  const source = invalid ? "" : src.trim();
  const status: ImagePreviewStatus = invalid
    ? "invalid"
    : !source
      ? "empty"
      : failedSrc === source
        ? "error"
        : loadedSrc === source
          ? "loaded"
          : "loading";
  const placeholder = aspect === "cover" ? CUSTOM_PLACEHOLDER_COVER : CUSTOM_PLACEHOLDER_HERO;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-border/70 bg-background/50",
          ASPECT_CLASS[aspect],
        )}
      >
        {source && status !== "error" ? (
          // Preview-only element; owner URLs are not whitelisted for the optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={source}
            src={source}
            alt={alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setLoadedSrc(source)}
            onError={() => setFailedSrc(source)}
            className={cn(
              "absolute inset-0 size-full object-cover transition-opacity duration-300",
              status === "loaded" ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={placeholder}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover opacity-45"
          />
        )}

        {status === "loading" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/55 p-2 text-center backdrop-blur-[1px]">
            <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
            <span className="text-[10px] text-muted-foreground">Loading preview…</span>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-background/60 p-2 text-center">
            <ImageOff className="size-4 text-destructive" aria-hidden="true" />
            <span className="text-[10px] leading-tight text-destructive">
              Preview unavailable · placeholder will be used
            </span>
          </div>
        ) : null}

        {status === "empty" ? (
          <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-center">
            <span className="text-[10px] text-foreground/70">Placeholder art</span>
          </div>
        ) : null}

        {status === "invalid" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-destructive/10 p-2 text-center">
            <ImageOff className="size-4 text-destructive" aria-hidden="true" />
            <span className="text-[10px] leading-tight text-destructive">Invalid image URL</span>
          </div>
        ) : null}

        {status === "loaded" ? (
          <span className="absolute top-1.5 right-1.5 rounded-full bg-emerald-500/90 p-1 text-black">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            <span className="sr-only">Preview loaded</span>
          </span>
        ) : null}
      </div>

      {showStatus ? (
        <p aria-live="polite" className="min-h-4 text-[11px]">
          {status === "empty" ? (
            <span className="text-muted-foreground">
              No image set — the placeholder will be used.
            </span>
          ) : status === "loading" ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              Loading preview…
            </span>
          ) : status === "loaded" ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-300">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              Image loaded successfully.
            </span>
          ) : status === "error" ? (
            <span className="inline-flex items-start gap-1.5 text-destructive">
              <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              The image could not be loaded. Some hosts block hotlinking; the storefront will show
              the placeholder instead.
            </span>
          ) : (
            <span className="text-destructive">Enter a valid https:// image URL.</span>
          )}
        </p>
      ) : null}
    </div>
  );
}
