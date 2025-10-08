"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { Button } from "@/components/ui/button";

type AuditImageViewerProps = {
  imageUrl?: string | null;
  markedImageUrl?: string | null;
  issues: string[];
};

export function AuditImageViewer({ imageUrl, markedImageUrl, issues }: AuditImageViewerProps) {
  const [variant, setVariant] = useState<"original" | "marked">("marked");

  const hasMarked = Boolean(markedImageUrl);
  const displayUrl = useMemo(() => {
    if (variant === "marked" && markedImageUrl) return markedImageUrl;
    return imageUrl ?? markedImageUrl ?? null;
  }, [imageUrl, markedImageUrl, variant]);

  if (!displayUrl) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/20 text-sm text-muted-foreground">
        <ImageIcon className="h-8 w-8" />
        <span>Imagem não disponível para este cartão.</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          Visualização do cartão
        </div>
        <div className="flex items-center gap-2">
          {hasMarked ? (
            <div className="inline-flex rounded-md border border-input bg-muted/30 p-1 text-xs">
              <button
                type="button"
                onClick={() => setVariant("original")}
                className={`rounded-sm px-3 py-1 transition ${variant === "original" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Original
              </button>
              <button
                type="button"
                onClick={() => setVariant("marked")}
                className={`rounded-sm px-3 py-1 transition ${variant === "marked" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Marcada
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <TransformWrapper
        wheel={{ step: 0.1 }}
        minScale={0.5}
        initialScale={hasMarked ? 0.9 : 1}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div className="relative flex h-[360px] flex-col overflow-hidden rounded-lg border border-border/60 bg-muted/10">
            <div className="absolute right-3 top-3 z-10 flex gap-2">
              <Button type="button" variant="secondary" size="icon" onClick={() => zoomOut()}>
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" size="icon" onClick={() => zoomIn()}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" size="icon" onClick={() => resetTransform()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <TransformComponent>
              <div className="relative h-full w-full">
                <Image
                  src={displayUrl}
                  alt="Cartão OMR"
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-contain"
                />
              </div>
            </TransformComponent>
          </div>
        )}
      </TransformWrapper>

      <div className="rounded-md border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Issues detectadas:</p>
        {issues.length === 0 ? (
          <p className="mt-1">Nenhum problema registrado.</p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
