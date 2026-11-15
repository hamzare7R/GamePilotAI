"use client";

import Image from "next/image";
import { useState } from "react";
import { Gamepad2 } from "lucide-react";

import { CUSTOM_PLACEHOLDER_COVER } from "@/lib/custom-game";
import { isRenderableImageUrl } from "@/lib/image-url";
import { cn } from "@/lib/utils";

/**
 * Hosts allowed through the Next.js optimizer. Everything else (owner-supplied
 * artwork on arbitrary CDNs) is rendered with a native <img>, because
 * whitelisting every custom domain in next.config is neither safe nor stable.
 */
const OPTIMIZED_HOSTS = new Set(["media.rawg.io"]);

type GameImageProps = {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

function isOptimizedSource(src: string) {
  if (src.startsWith("/")) return true;
  try {
    return OPTIMIZED_HOSTS.has(new URL(src).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function GameImage({
  src,
  alt,
  fallbackSrc = CUSTOM_PLACEHOLDER_COVER,
  className,
  sizes,
  priority = false,
}: GameImageProps) {
  // Failure state is keyed by URL instead of reset via effects: if the src
  // changes the stale key no longer matches, so the new image loads normally.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [fallbackFailedSrc, setFallbackFailedSrc] = useState<string | null>(null);

  const requested = isRenderableImageUrl(src) ? src!.trim() : "";
  const primaryFailed = requested !== "" && failedSrc === requested;
  const usingFallback = !requested || primaryFailed;
  const effectiveSrc = usingFallback ? fallbackSrc : requested;
  // Defense in depth: never send an unsupported scheme to the browser.
  const safeSrc = isRenderableImageUrl(effectiveSrc) ? effectiveSrc : CUSTOM_PLACEHOLDER_COVER;
  const optimized = isOptimizedSource(safeSrc);
  const fallbackFailed = usingFallback && fallbackFailedSrc === safeSrc;

  const handleError = () => {
    if (usingFallback) setFallbackFailedSrc(safeSrc);
    else setFailedSrc(requested);
  };

  if (fallbackFailed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-linear-to-br from-[#141026] via-[#0b0b14] to-[#1a1030]",
          className,
        )}
      >
        <Gamepad2 className="size-10 text-primary/40" aria-hidden="true" />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  if (optimized) {
    return (
      <Image
        src={safeSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={handleError}
        className={className}
      />
    );
  }

  return (
    // Owner-supplied CDN URLs are intentionally not whitelisted for the optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={safeSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleError}
      className={cn("absolute inset-0 size-full object-cover", className)}
    />
  );
}
