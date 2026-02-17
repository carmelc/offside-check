import { Point, OffsideLine, CalibrationState } from "@/types";
import { extendLineToBounds } from "./geometry";

interface RenderParams {
  ctx: CanvasRenderingContext2D;
  image: HTMLImageElement | null;
  canvasWidth: number;
  canvasHeight: number;
  imageScale: number;
  imageOffset: Point;
  calibration: CalibrationState;
  vanishingPoint: Point | null;
  offsideLines: OffsideLine[];
  hoverPoint: Point | null;
  nextColor: string;
  dpr: number;
}

function imageToScreen(p: Point, scale: number, offset: Point): Point {
  return {
    x: p.x * scale + offset.x,
    y: p.y * scale + offset.y,
  };
}

function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  p1: Point,
  p2: Point,
  color: string,
  lineWidth: number,
  dash: number[] = [8, 6]
) {
  ctx.beginPath();
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawSolidLine(
  ctx: CanvasRenderingContext2D,
  p1: Point,
  p2: Point,
  color: string,
  lineWidth: number
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
}

function drawPoint(
  ctx: CanvasRenderingContext2D,
  p: Point,
  color: string,
  radius: number
) {
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  p: Point,
  color: string,
  size: number
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(p.x - size, p.y);
  ctx.lineTo(p.x + size, p.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(p.x, p.y - size);
  ctx.lineTo(p.x, p.y + size);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(p.x, p.y, size * 0.6, 0, Math.PI * 2);
  ctx.stroke();
}

export function renderCanvas(params: RenderParams) {
  const {
    ctx,
    image,
    canvasWidth,
    canvasHeight,
    imageScale,
    imageOffset,
    calibration,
    vanishingPoint,
    offsideLines,
    hoverPoint,
    nextColor,
    dpr,
  } = params;

  // Clear
  ctx.clearRect(0, 0, canvasWidth * dpr, canvasHeight * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Image
  if (image) {
    ctx.drawImage(
      image,
      imageOffset.x,
      imageOffset.y,
      image.width * imageScale,
      image.height * imageScale
    );
  }

  // Calibration lines
  if (calibration.line1) {
    const sp1 = imageToScreen(calibration.line1.p1, imageScale, imageOffset);
    const sp2 = imageToScreen(calibration.line1.p2, imageScale, imageOffset);
    const [ext1, ext2] = extendLineToBounds(sp1, sp2, canvasWidth, canvasHeight);
    drawDashedLine(ctx, ext1, ext2, "#00FFFF", 2);
  }

  if (calibration.line2) {
    const sp1 = imageToScreen(calibration.line2.p1, imageScale, imageOffset);
    const sp2 = imageToScreen(calibration.line2.p2, imageScale, imageOffset);
    const [ext1, ext2] = extendLineToBounds(sp1, sp2, canvasWidth, canvasHeight);
    drawDashedLine(ctx, ext1, ext2, "#FF00FF", 2);
  }

  // Calibration points
  const calColors = ["#00FFFF", "#00FFFF", "#FF00FF", "#FF00FF"];
  calibration.points.forEach((p, i) => {
    const sp = imageToScreen(p, imageScale, imageOffset);
    drawPoint(ctx, sp, calColors[i] || "#FFFFFF", 6);
  });

  // Vanishing point
  if (vanishingPoint) {
    const svp = imageToScreen(vanishingPoint, imageScale, imageOffset);
    drawCrosshair(ctx, svp, "#FFFF00", 12);
  }

  // Offside lines
  offsideLines.forEach((line) => {
    if (!vanishingPoint) return;
    const svp = imageToScreen(vanishingPoint, imageScale, imageOffset);
    const stp = imageToScreen(line.throughPoint, imageScale, imageOffset);
    const [ext1, ext2] = extendLineToBounds(svp, stp, canvasWidth, canvasHeight);
    drawSolidLine(ctx, ext1, ext2, line.color, 2.5);
    drawPoint(ctx, stp, line.color, 5);
  });

  // Hover preview
  if (hoverPoint && vanishingPoint) {
    const svp = imageToScreen(vanishingPoint, imageScale, imageOffset);
    const shp = imageToScreen(hoverPoint, imageScale, imageOffset);
    const [ext1, ext2] = extendLineToBounds(svp, shp, canvasWidth, canvasHeight);
    ctx.globalAlpha = 0.4;
    drawSolidLine(ctx, ext1, ext2, nextColor, 2);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
