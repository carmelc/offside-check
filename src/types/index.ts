export interface Point {
  x: number;
  y: number;
}

export interface Line {
  p1: Point;
  p2: Point;
}

export interface OffsideLine {
  id: string;
  throughPoint: Point;
  color: string;
}

export interface CustomLine {
  id: string;
  p1: Point;
  p2: Point;
  color: string;
}

export type AppMode = "upload" | "calibration" | "offside";

export type DraggablePointSource =
  | { kind: "calibration"; index: number }
  | { kind: "offside"; lineId: string }
  | { kind: "custom"; lineId: string; endpoint: "p1" | "p2" };

export interface DragState {
  source: DraggablePointSource;
  originalPoint: Point;
  currentPoint: Point;
}

export interface CalibrationState {
  points: Point[];
  line1: Line | null;
  line2: Line | null;
}

export interface ZoomControls {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  zoomLevel: number;
}

export interface ShareData {
  id: string;
  imageUrl: string;
  calibration: { points: Point[] };
  vanishingPoint: Point;
  offsideLines: OffsideLine[];
  customLines?: CustomLine[];
  imageWidth: number;
  imageHeight: number;
}
