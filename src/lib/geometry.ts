import { Point, Line } from "@/types";

export function imageToScreen(p: Point, scale: number, offset: Point): Point {
  return {
    x: p.x * scale + offset.x,
    y: p.y * scale + offset.y,
  };
}

export function screenToImage(
  screenPoint: Point,
  scale: number,
  offset: Point
): Point {
  return {
    x: (screenPoint.x - offset.x) / scale,
    y: (screenPoint.y - offset.y) / scale,
  };
}

/**
 * Compute the intersection of two lines, each defined by two points.
 * Returns null if lines are (near-)parallel.
 */
export function lineIntersection(a: Line, b: Line): Point | null {
  const { p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 } } = a;
  const { p1: { x: x3, y: y3 }, p2: { x: x4, y: y4 } } = b;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 1e-10) {
    return null; // Lines are parallel
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;

  return {
    x: x1 + t * (x2 - x1),
    y: y1 + t * (y2 - y1),
  };
}

/**
 * Compute the pan offset that keeps the image point under focalScreenPoint
 * fixed after changing zoom from old effective transform to newZoom.
 */
export function computePanForZoomAroundPoint(
  focalScreenPoint: Point,
  newZoom: number,
  baseScale: number,
  baseOffset: Point,
  canvasCenter: Point,
  oldEffScale: number,
  oldEffOffset: Point
): Point {
  // Image point under the focal screen point before zoom
  const imgX = (focalScreenPoint.x - oldEffOffset.x) / oldEffScale;
  const imgY = (focalScreenPoint.y - oldEffOffset.y) / oldEffScale;

  // New effective scale
  const newEffScale = baseScale * newZoom;

  // New effective offset without pan:
  // effOffset.x = baseOffset.x * zoom + centerX * (1 - zoom) + pan.x
  // We want focalScreenPoint.x = imgX * newEffScale + newEffOffset.x
  // So pan.x = focalScreenPoint.x - imgX * newEffScale - (baseOffset.x * newZoom + centerX * (1 - newZoom))
  const basePart = baseOffset.x * newZoom + canvasCenter.x * (1 - newZoom);
  const panX = focalScreenPoint.x - imgX * newEffScale - basePart;

  const basePartY = baseOffset.y * newZoom + canvasCenter.y * (1 - newZoom);
  const panY = focalScreenPoint.y - imgY * newEffScale - basePartY;

  return { x: panX, y: panY };
}

/**
 * Extend a line defined by two points to the edges of a bounding rectangle.
 * Returns the two intersection points with the rectangle edges.
 */
export function extendLineToBounds(
  p1: Point,
  p2: Point,
  width: number,
  height: number
): [Point, Point] {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
    return [p1, p2];
  }

  const intersections: Point[] = [];

  // Left edge (x = 0)
  if (Math.abs(dx) > 1e-10) {
    const t = (0 - p1.x) / dx;
    const y = p1.y + t * dy;
    if (y >= -height && y <= 2 * height) {
      intersections.push({ x: 0, y });
    }
  }

  // Right edge (x = width)
  if (Math.abs(dx) > 1e-10) {
    const t = (width - p1.x) / dx;
    const y = p1.y + t * dy;
    if (y >= -height && y <= 2 * height) {
      intersections.push({ x: width, y });
    }
  }

  // Top edge (y = 0)
  if (Math.abs(dy) > 1e-10) {
    const t = (0 - p1.y) / dy;
    const x = p1.x + t * dx;
    if (x >= -width && x <= 2 * width) {
      intersections.push({ x, y: 0 });
    }
  }

  // Bottom edge (y = height)
  if (Math.abs(dy) > 1e-10) {
    const t = (height - p1.y) / dy;
    const x = p1.x + t * dx;
    if (x >= -width && x <= 2 * width) {
      intersections.push({ x, y: height });
    }
  }

  // Remove near-duplicate intersections
  const unique: Point[] = [];
  for (const pt of intersections) {
    if (!unique.some((u) => Math.abs(u.x - pt.x) < 0.5 && Math.abs(u.y - pt.y) < 0.5)) {
      unique.push(pt);
    }
  }

  if (unique.length >= 2) {
    return [unique[0], unique[1]];
  }

  // Fallback: just extend far along the direction
  return [
    { x: p1.x - dx * 10000, y: p1.y - dy * 10000 },
    { x: p1.x + dx * 10000, y: p1.y + dy * 10000 },
  ];
}
