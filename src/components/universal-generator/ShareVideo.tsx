import { useEffect, useRef, useState } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

import { getShareVideoDurationSeconds, pickShareVideoMimeType } from "./shareVideoUtils";
import type { GeneratedResult, VariableGroup } from "./types";

interface ShareVideoProps {
  promptTemplate: string;
  originalPromptTemplate?: string | null;
  sourceImageUrls?: string[];
  variableGroups: VariableGroup[];
  results: GeneratedResult[];
  onComplete: () => void;
  onError: (msg: string) => void;
}

interface ImageAsset {
  image: HTMLCanvasElement | HTMLImageElement;
  width: number;
  height: number;
  url: string;
}

interface ResultAsset extends ImageAsset {
  prompt: string;
}

interface VideoAssetSet {
  sources: ImageAsset[];
  results: ResultAsset[];
}

interface ShareVideoLabels {
  originalPrompt: string;
  result: string;
  tagline: string;
  madeWith: string;
}

const EMPTY_SOURCE_IMAGE_URLS: string[] = [];
const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const VIDEO_FPS = 30;
const INTRO_SECONDS = 1.4;
const OUTRO_SECONDS = 1.1;

async function urlToObjectUrl(url: string): Promise<string> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Image request failed: ${resp.status}`);
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
}

async function loadImage(url: string): Promise<ImageAsset | null> {
  let objectUrl: string | null = null;
  try {
    objectUrl = await urlToObjectUrl(url);
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Image failed to load"));
      image.src = objectUrl!;
    });
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      url: objectUrl,
    };
  } catch {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    return null;
  }
}

async function loadVideoPoster(url: string): Promise<ImageAsset | null> {
  let objectUrl: string | null = null;
  try {
    objectUrl = await urlToObjectUrl(url);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Video failed to load"));
      video.src = objectUrl!;
      video.load();
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || VIDEO_WIDTH;
    canvas.height = video.videoHeight || VIDEO_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    video.removeAttribute("src");
    video.load();
    return {
      image: canvas,
      width: canvas.width,
      height: canvas.height,
      url: objectUrl,
    };
  } catch {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    return null;
  }
}

async function loadMediaAsset(
  url: string,
  mediaType?: GeneratedResult["mediaType"],
): Promise<ImageAsset | null> {
  return mediaType === "video" ? loadVideoPoster(url) : loadImage(url);
}

async function loadAssets(
  sourceImageUrls: string[],
  results: GeneratedResult[],
): Promise<VideoAssetSet> {
  const sources = (
    await Promise.all(sourceImageUrls.slice(0, 2).map((url) => loadImage(url)))
  ).filter((asset): asset is ImageAsset => !!asset);

  const completeResults = results.filter(
    (result) => result.status === "complete" && result.imageUrl,
  );
  const resultAssets = await Promise.all(
    completeResults.slice(0, 8).map(async (result) => {
      const asset = await loadMediaAsset(result.imageUrl!, result.mediaType);
      if (!asset) return null;
      return {
        ...asset,
        prompt: result.combination.prompt,
      };
    }),
  );

  return {
    sources,
    results: resultAssets.filter((asset): asset is ResultAsset => !!asset),
  };
}

function disposeAssets(assets: VideoAssetSet): void {
  for (const asset of [...assets.sources, ...assets.results]) {
    URL.revokeObjectURL(asset.url);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  asset: ImageAsset,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  scale = 1,
): void {
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();

  const imageRatio = asset.width / asset.height;
  const targetRatio = width / height;
  let drawWidth = width * scale;
  let drawHeight = height * scale;
  if (imageRatio > targetRatio) {
    drawWidth = drawHeight * imageRatio;
  } else {
    drawHeight = drawWidth / imageRatio;
  }
  ctx.drawImage(
    asset.image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  ctx.restore();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  const normalized = text.replace(/\s+/g, " ").trim();
  const hasSpaces = normalized.includes(" ");
  const separator = hasSpaces ? " " : "";
  const words = hasSpaces ? normalized.split(" ") : Array.from(normalized);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current}${separator}${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  lines.forEach((line, index) => {
    const suffix =
      index === maxLines - 1 && normalized.length > lines.join(separator).length ? "..." : "";
    ctx.fillText(`${line}${suffix}`, x, y + index * lineHeight);
  });
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  gradient.addColorStop(0, "#f8fafc");
  gradient.addColorStop(0.45, "#eef2ff");
  gradient.addColorStop(1, "#fdf2f8");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  ctx.fillStyle = "rgba(37, 99, 235, 0.08)";
  ctx.beginPath();
  ctx.arc(940, 210, 300, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(236, 72, 153, 0.07)";
  ctx.beginPath();
  ctx.arc(120, 1730, 360, 0, Math.PI * 2);
  ctx.fill();
}

function drawBrand(ctx: CanvasRenderingContext2D, y = 116): void {
  ctx.fillStyle = "#111827";
  ctx.font = "700 46px Inter, system-ui, sans-serif";
  ctx.fillText("BatchlyAI", 76, y);
  ctx.fillStyle = "#6b7280";
  ctx.font = "500 26px Inter, system-ui, sans-serif";
  ctx.fillText("batchlyai.com", 76, y + 42);
}

function drawPromptCard(
  ctx: CanvasRenderingContext2D,
  label: string,
  prompt: string,
  y: number,
): void {
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  roundRect(ctx, 76, y, 928, 250, 34);
  ctx.fill();

  ctx.fillStyle = "#6b7280";
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  ctx.fillText(label.toUpperCase(), 116, y + 62);

  ctx.fillStyle = "#111827";
  ctx.font = "600 38px Inter, system-ui, sans-serif";
  drawWrappedText(ctx, prompt, 116, y + 122, 848, 48, 3);
}

function drawIntroFrame(
  ctx: CanvasRenderingContext2D,
  assets: VideoAssetSet,
  prompt: string,
  labels: ShareVideoLabels,
  progress: number,
): void {
  drawBackground(ctx);
  drawBrand(ctx);
  const asset = assets.sources[0] ?? assets.results[0];
  if (asset) {
    drawCoverImage(ctx, asset, 76, 245, 928, 1008, 44, 1.02 + progress * 0.025);
  }
  drawPromptCard(ctx, labels.originalPrompt, prompt, 1325);
}

function drawResultFrame(
  ctx: CanvasRenderingContext2D,
  asset: ResultAsset,
  index: number,
  count: number,
  labels: ShareVideoLabels,
  progress: number,
): void {
  drawBackground(ctx);
  drawBrand(ctx, 106);
  drawCoverImage(ctx, asset, 76, 230, 928, 1190, 44, 1.02 + progress * 0.035);

  ctx.fillStyle = "rgba(17, 24, 39, 0.72)";
  roundRect(ctx, 116, 1250, 848, 128, 28);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 32px Inter, system-ui, sans-serif";
  ctx.fillText(`${labels.result} ${index + 1} / ${count}`, 158, 1302);
  ctx.font = "500 24px Inter, system-ui, sans-serif";
  drawWrappedText(ctx, asset.prompt, 158, 1346, 760, 34, 2);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  roundRect(ctx, 266, 1502, 548, 96, 48);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.font = "700 34px Inter, system-ui, sans-serif";
  ctx.fillText(labels.madeWith, 336, 1562);
}

function drawOutroFrame(ctx: CanvasRenderingContext2D, labels: ShareVideoLabels): void {
  drawBackground(ctx);
  ctx.fillStyle = "#111827";
  ctx.font = "800 80px Inter, system-ui, sans-serif";
  ctx.fillText("BatchlyAI", 296, 875);
  ctx.fillStyle = "#4b5563";
  ctx.font = "500 36px Inter, system-ui, sans-serif";
  ctx.fillText(labels.tagline, 245, 940);
  ctx.fillStyle = "#2563eb";
  ctx.font = "700 32px Inter, system-ui, sans-serif";
  ctx.fillText("batchlyai.com", 412, 1018);
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  assets: VideoAssetSet,
  prompt: string,
  labels: ShareVideoLabels,
  elapsedSeconds: number,
  durationSeconds: number,
): void {
  if (elapsedSeconds < INTRO_SECONDS) {
    drawIntroFrame(ctx, assets, prompt, labels, elapsedSeconds / INTRO_SECONDS);
    return;
  }

  if (elapsedSeconds > durationSeconds - OUTRO_SECONDS) {
    drawOutroFrame(ctx, labels);
    return;
  }

  const slideDuration = (durationSeconds - INTRO_SECONDS - OUTRO_SECONDS) / assets.results.length;
  const slideElapsed = elapsedSeconds - INTRO_SECONDS;
  const index = Math.min(assets.results.length - 1, Math.floor(slideElapsed / slideDuration));
  const progress = (slideElapsed - index * slideDuration) / slideDuration;
  drawResultFrame(ctx, assets.results[index], index, assets.results.length, labels, progress);
}

function canvasToVideoBlob(
  canvas: HTMLCanvasElement,
  assets: VideoAssetSet,
  prompt: string,
  labels: ShareVideoLabels,
  mimeType: string,
  durationSeconds: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const stream = canvas.captureStream(VIDEO_FPS);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    let animationFrame = 0;
    let startedAt = 0;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas unavailable"));
      return;
    }

    const cleanup = () => {
      cancelAnimationFrame(animationFrame);
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => {
      cleanup();
      reject(new Error("Video recording failed"));
    };
    recorder.onstop = () => {
      cleanup();
      resolve(new Blob(chunks, { type: mimeType }));
    };

    const render = (now: number) => {
      if (!startedAt) startedAt = now;
      const elapsed = (now - startedAt) / 1000;
      drawFrame(ctx, assets, prompt, labels, Math.min(elapsed, durationSeconds), durationSeconds);
      if (elapsed >= durationSeconds) {
        recorder.stop();
        return;
      }
      animationFrame = requestAnimationFrame(render);
    };

    try {
      recorder.start();
      animationFrame = requestAnimationFrame(render);
    } catch (err) {
      cleanup();
      reject(err instanceof Error ? err : new Error("Video recording failed"));
    }
  });
}

async function saveOrShareVideoBlob(
  blob: Blob,
  extension: "mp4" | "webm",
  filename: string,
): Promise<void> {
  const file = new File([blob], `${filename}.${extension}`, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "BatchlyAI",
      });
      return;
    } catch {
      // Fall back to downloading the file.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.${extension}`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function ShareVideo({
  promptTemplate,
  originalPromptTemplate,
  sourceImageUrls = EMPTY_SOURCE_IMAGE_URLS,
  results,
  onComplete,
  onError,
}: ShareVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useLanguage();
  const [isPreparing, setIsPreparing] = useState(true);
  const cleanedOriginalPrompt = originalPromptTemplate?.trim() || "";
  const displayPrompt = cleanedOriginalPrompt || promptTemplate;

  useEffect(() => {
    let cancelled = false;
    let assets: VideoAssetSet | null = null;

    async function createVideo() {
      const canvas = canvasRef.current;
      const mime = pickShareVideoMimeType();
      if (!canvas || !("captureStream" in canvas) || !mime) {
        onError(t("shareVideoUnsupported"));
        return;
      }

      assets = await loadAssets(sourceImageUrls, results);
      if (cancelled) return;
      if (assets.results.length === 0) {
        onError(t("shareVideoNoImages"));
        return;
      }

      const blob = await canvasToVideoBlob(
        canvas,
        assets,
        displayPrompt,
        {
          originalPrompt: t("shareOriginalPrompt"),
          result: t("shareVideoResult"),
          tagline: t("shareVideoTagline"),
          madeWith: t("shareVideoMadeWith"),
        },
        mime.mimeType,
        getShareVideoDurationSeconds(assets.results.length),
      );
      if (cancelled) return;
      await saveOrShareVideoBlob(blob, mime.extension, `batchlyai-${Date.now()}`);
      if (cancelled) return;
      setIsPreparing(false);
      onComplete();
    }

    void createVideo().catch((err) => {
      if (!cancelled) {
        onError(err instanceof Error ? err.message : t("shareVideoFailed"));
      }
    });

    return () => {
      cancelled = true;
      if (assets) disposeAssets(assets);
    };
  }, [displayPrompt, onComplete, onError, results, sourceImageUrls, t]);

  return (
    <div className="fixed top-0 left-0 z-[9999] flex h-full w-full items-center justify-center bg-black/40 backdrop-blur-sm">
      <canvas ref={canvasRef} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} className="hidden" />
      {isPreparing && (
        <div className="rounded-2xl bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
          <p className="text-sm text-foreground">{t("shareVideoLoading")}</p>
        </div>
      )}
    </div>
  );
}
