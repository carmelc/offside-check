import { CalibrationState, OffsideLine, Point } from "@/types";

const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB
const INITIAL_MAX_DIMENSION = 2048;
const INITIAL_QUALITY = 0.75;
const MIN_QUALITY = 0.3;
const DIMENSION_STEP = 0.75; // shrink by 25% each iteration

interface ShareInput {
  image: HTMLImageElement;
  calibration: CalibrationState;
  vanishingPoint: Point;
  offsideLines: OffsideLine[];
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });
}

async function compressImage(
  image: HTMLImageElement
): Promise<{ blob: Blob; scale: number }> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  let maxDim = INITIAL_MAX_DIMENSION;
  let quality = INITIAL_QUALITY;

  while (true) {
    let width = image.width;
    let height = image.height;
    let scale = 1;

    if (width > maxDim || height > maxDim) {
      scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    const blob = await toBlob(canvas, quality);
    if (!blob) throw new Error("Failed to compress image");

    if (blob.size <= MAX_SIZE_BYTES) {
      return { blob, scale };
    }

    // Try reducing quality first, then shrink dimensions
    if (quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.15);
    } else {
      maxDim = Math.round(maxDim * DIMENSION_STEP);
    }
  }
}

function scalePoint(point: Point, scale: number): Point {
  return { x: point.x * scale, y: point.y * scale };
}

export async function createShare(
  input: ShareInput
): Promise<{ id: string; url: string }> {
  const { image, calibration, vanishingPoint, offsideLines } = input;
  const { blob, scale } = await compressImage(image);

  const scaledPoints = calibration.points.map((p) => scalePoint(p, scale));
  const scaledVanishingPoint = scalePoint(vanishingPoint, scale);
  const scaledOffsideLines = offsideLines.map((line) => ({
    ...line,
    throughPoint: scalePoint(line.throughPoint, scale),
  }));

  const metadata = {
    calibration: { points: scaledPoints },
    vanishingPoint: scaledVanishingPoint,
    offsideLines: scaledOffsideLines,
    imageWidth: Math.round(image.width * scale),
    imageHeight: Math.round(image.height * scale),
  };

  const formData = new FormData();
  formData.append("image", blob, "image.jpg");
  formData.append("metadata", JSON.stringify(metadata));

  const response = await fetch("/api/share", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create share");
  }

  return response.json();
}
