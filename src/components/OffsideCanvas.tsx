"use client";

import { useRef, useEffect } from "react";
import { Point, AppMode, CalibrationState, OffsideLine, ZoomControls } from "@/types";
import { useCanvasInteraction } from "@/hooks/useCanvasInteraction";

interface OffsideCanvasProps {
  image: HTMLImageElement;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  calibration: CalibrationState;
  setCalibration: React.Dispatch<React.SetStateAction<CalibrationState>>;
  vanishingPoint: Point | null;
  setVanishingPoint: (vp: Point | null) => void;
  offsideLines: OffsideLine[];
  setOffsideLines: React.Dispatch<React.SetStateAction<OffsideLine[]>>;
  parallelError: boolean;
  setParallelError: (err: boolean) => void;
  onZoomControlsReady?: (controls: ZoomControls) => void;
}

export default function OffsideCanvas({
  image,
  mode,
  setMode,
  calibration,
  setCalibration,
  vanishingPoint,
  setVanishingPoint,
  offsideLines,
  setOffsideLines,
  parallelError,
  setParallelError,
  onZoomControlsReady,
}: OffsideCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    handleCanvasClick,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasMouseLeave,
    handleCanvasTouchStart,
    handleCanvasTouchMove,
    handleCanvasTouchEnd,
    zoomIn,
    zoomOut,
    resetView,
    zoomLevel,
  } = useCanvasInteraction({
    canvasRef,
    image,
    mode,
    setMode,
    calibration,
    setCalibration,
    vanishingPoint,
    setVanishingPoint,
    offsideLines,
    setOffsideLines,
    parallelError,
    setParallelError,
  });

  useEffect(() => {
    onZoomControlsReady?.({ zoomIn, zoomOut, resetView, zoomLevel });
  }, [onZoomControlsReady, zoomIn, zoomOut, resetView, zoomLevel]);

  const cursorClass =
    mode === "calibration" || mode === "offside"
      ? "cursor-crosshair"
      : "cursor-default";

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
        onTouchStart={handleCanvasTouchStart}
        onTouchMove={handleCanvasTouchMove}
        onTouchEnd={handleCanvasTouchEnd}
        className={`w-full h-full ${cursorClass}`}
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
