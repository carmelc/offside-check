import { useCallback, useRef, useEffect, useState } from "react";
import { Point, AppMode, CalibrationState, OffsideLine } from "@/types";
import { lineIntersection } from "@/lib/geometry";
import { getOffsideColor } from "@/lib/colors";
import { renderCanvas } from "@/lib/canvasRenderer";

interface UseCanvasInteractionProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  image: HTMLImageElement | null;
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
}

function screenToImage(
  screenPoint: Point,
  scale: number,
  offset: Point
): Point {
  return {
    x: (screenPoint.x - offset.x) / scale,
    y: (screenPoint.y - offset.y) / scale,
  };
}

export function useCanvasInteraction({
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
  setParallelError,
}: UseCanvasInteractionProps) {
  const [hoverImagePoint, setHoverImagePoint] = useState<Point | null>(null);
  const layoutRef = useRef<{
    scale: number;
    offset: Point;
    canvasWidth: number;
    canvasHeight: number;
  }>({ scale: 1, offset: { x: 0, y: 0 }, canvasWidth: 0, canvasHeight: 0 });

  const computeLayout = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const container = canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;

    const scaleX = cw / image.width;
    const scaleY = ch / image.height;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (cw - image.width * scale) / 2;
    const offsetY = (ch - image.height * scale) / 2;

    layoutRef.current = {
      scale,
      offset: { x: offsetX, y: offsetY },
      canvasWidth: cw,
      canvasHeight: ch,
    };
  }, [canvasRef, image]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    computeLayout();
    const { scale, offset, canvasWidth, canvasHeight } = layoutRef.current;
    const dpr = window.devicePixelRatio || 1;

    renderCanvas({
      ctx,
      image,
      canvasWidth,
      canvasHeight,
      imageScale: scale,
      imageOffset: offset,
      calibration,
      vanishingPoint,
      offsideLines,
      hoverPoint: mode === "offside" ? hoverImagePoint : null,
      nextColor: getOffsideColor(offsideLines.length),
      dpr,
    });
  }, [
    canvasRef,
    image,
    calibration,
    vanishingPoint,
    offsideLines,
    hoverImagePoint,
    mode,
    computeLayout,
  ]);

  // Re-render on state changes
  useEffect(() => {
    render();
  }, [render]);

  // ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas?.parentElement) return;

    const observer = new ResizeObserver(() => {
      render();
    });
    observer.observe(canvas.parentElement);
    return () => observer.disconnect();
  }, [canvasRef, render]);

  const getImagePoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const screenPoint: Point = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };

      const { scale, offset } = layoutRef.current;
      return screenToImage(screenPoint, scale, offset);
    },
    [canvasRef]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const imagePoint = getImagePoint(e);
      if (!imagePoint) return;

      if (mode === "calibration") {
        setCalibration((prev) => {
          const newPoints = [...prev.points, imagePoint];
          let line1 = prev.line1;
          let line2 = prev.line2;

          if (newPoints.length === 2) {
            line1 = { p1: newPoints[0], p2: newPoints[1] };
          }

          if (newPoints.length === 4) {
            line2 = { p1: newPoints[2], p2: newPoints[3] };

            // Compute vanishing point
            if (line1 && line2) {
              const vp = lineIntersection(line1, line2);
              if (vp) {
                setVanishingPoint(vp);
                setMode("offside");
                setParallelError(false);
              } else {
                setParallelError(true);
              }
            }
          }

          if (newPoints.length > 4) return prev;

          return { ...prev, points: newPoints, line1, line2 };
        });
      } else if (mode === "offside" && vanishingPoint) {
        const newLine: OffsideLine = {
          id: crypto.randomUUID(),
          throughPoint: imagePoint,
          color: getOffsideColor(offsideLines.length),
        };
        setOffsideLines((prev) => [...prev, newLine]);
      }
    },
    [
      mode,
      getImagePoint,
      vanishingPoint,
      offsideLines.length,
      setCalibration,
      setVanishingPoint,
      setMode,
      setOffsideLines,
      setParallelError,
    ]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (mode !== "offside") {
        setHoverImagePoint(null);
        return;
      }
      const imagePoint = getImagePoint(e);
      setHoverImagePoint(imagePoint);
    },
    [mode, getImagePoint]
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setHoverImagePoint(null);
  }, []);

  const handleCanvasTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const imagePoint = getImagePoint(e);
      if (!imagePoint) return;

      // Simulate a click via the same logic
      if (mode === "calibration") {
        setCalibration((prev) => {
          const newPoints = [...prev.points, imagePoint];
          let line1 = prev.line1;
          let line2 = prev.line2;

          if (newPoints.length === 2) {
            line1 = { p1: newPoints[0], p2: newPoints[1] };
          }

          if (newPoints.length === 4) {
            line2 = { p1: newPoints[2], p2: newPoints[3] };

            if (line1 && line2) {
              const vp = lineIntersection(line1, line2);
              if (vp) {
                setVanishingPoint(vp);
                setMode("offside");
                setParallelError(false);
              } else {
                setParallelError(true);
              }
            }
          }

          if (newPoints.length > 4) return prev;

          return { ...prev, points: newPoints, line1, line2 };
        });
      } else if (mode === "offside" && vanishingPoint) {
        const newLine: OffsideLine = {
          id: crypto.randomUUID(),
          throughPoint: imagePoint,
          color: getOffsideColor(offsideLines.length),
        };
        setOffsideLines((prev) => [...prev, newLine]);
      }
    },
    [
      mode,
      getImagePoint,
      vanishingPoint,
      offsideLines.length,
      setCalibration,
      setVanishingPoint,
      setMode,
      setOffsideLines,
      setParallelError,
    ]
  );

  return {
    handleCanvasClick,
    handleCanvasMouseMove,
    handleCanvasMouseLeave,
    handleCanvasTouchStart,
    render,
  };
}
