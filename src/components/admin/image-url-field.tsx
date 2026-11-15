"use client";

import { Trash2 } from "lucide-react";

import { ImagePreview } from "@/components/admin/image-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { IMAGE_URL_HINT, MAX_IMAGE_URL_LENGTH, validateImageUrl } from "@/lib/image-url";

type ImageUrlFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  aspect?: "cover" | "wide";
  help?: string;
  placeholder?: string;
};

export function ImageUrlField({
  id,
  label,
  value,
  onChange,
  aspect = "cover",
  help,
  placeholder = "https://example.com/artwork.jpg",
}: ImageUrlFieldProps) {
  const debounced = useDebouncedValue(value.trim(), 450);
  const check = validateImageUrl(value);
  const isValid = check.ok;
  const trimmed = value.trim();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {trimmed ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Remove image
          </Button>
        ) : null}
      </div>

      <Input
        id={id}
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={value}
        maxLength={MAX_IMAGE_URL_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={!isValid}
        aria-describedby={`${id}-hint`}
      />

      <p id={`${id}-hint`} className="text-[11px] text-muted-foreground">
        {help ?? IMAGE_URL_HINT}
      </p>

      {!isValid ? (
        <p className="text-[11px] text-destructive" role="alert">
          {check.ok ? null : check.message}
        </p>
      ) : null}

      <ImagePreview
        src={isValid ? debounced : ""}
        alt={`${label} preview`}
        aspect={aspect}
        invalid={!isValid && trimmed.length > 0}
      />
    </div>
  );
}
