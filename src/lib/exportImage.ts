import { CalibrationState, OffsideLine, Point } from "@/types";
import { renderCanvas } from "./canvasRenderer";
import { getOffsideColor } from "./colors";

interface ExportParams {
  image: HTMLImageElement;
  calibration: CalibrationState;
  vanishingPoint: Point | null;
  offsideLines: OffsideLine[];
}

function renderToBlob(params: ExportParams): Promise<Blob> {
  const { image, calibration, vanishingPoint, offsideLines } = params;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  renderCanvas({
    ctx,
    image,
    canvasWidth: image.width,
    canvasHeight: image.height,
    imageScale: 1,
    imageOffset: { x: 0, y: 0 },
    calibration,
    vanishingPoint,
    offsideLines,
    hoverPoint: null,
    nextColor: getOffsideColor(offsideLines.length),
    dpr: 1,
    activeDrag: null,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to export image"))),
      "image/png"
    );
  });
}

export async function copyImageToClipboard(params: ExportParams): Promise<void> {
  const blob = await renderToBlob(params);
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob }),
  ]);
}

export async function downloadImage(params: ExportParams): Promise<void> {
  const blob = await renderToBlob(params);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "offside-analysis.png";
  a.click();
  URL.revokeObjectURL(url);
}
