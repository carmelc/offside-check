import { useCallback, useRef, useEffect, useState } from "react";
import { Point, AppMode, CalibrationState, OffsideLine, DragState, DraggablePointSource } from "@/types";
import { lineIntersection, screenToImage, imageToScreen } from "@/lib/geometry";
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

type GestureType = "none" | "tap" | "drag" | "pinch";

interface PendingTouch {
  screenPoint: Point;
  imagePoint: Point;
  hitTarget: DraggablePointSource | null;
  timestamp: number;
  gesture: GestureType;
}

const DRAG_THRESHOLD = 8; // px — distinguishes tap from drag
const TAP_MAX_DURATION = 300; // ms
const HIT_RADIUS = 24; // px — comfortable touch target

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
  const [activeDrag, setActiveDrag] = useState<DragState | null>(null);

  const layoutRef = useRef<{
    scale: number;
    offset: Point;
    canvasWidth: number;
    canvasHeight: number;
  }>({ scale: 1, offset: { x: 0, y: 0 }, canvasWidth: 0, canvasHeight: 0 });

  // Gesture tracking refs (no re-renders)
  const pendingTouchRef = useRef<PendingTouch | null>(null);
  const mouseDragRef = useRef<{ source: DraggablePointSource; startScreen: Point } | null>(null);
  const justDraggedRef = useRef(false);

  // Stable refs for values needed in callbacks without re-creating them
  const calibrationRef = useRef(calibration);
  const offsideLinesRef = useRef(offsideLines);
  useEffect(() => {
    calibrationRef.current = calibration;
    offsideLinesRef.current = offsideLines;
  }, [calibration, offsideLines]);

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
      activeDrag,
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
    activeDrag,
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

  // --- Helpers ---

  const getScreenPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [canvasRef]
  );

  const getImagePointFromScreen = useCallback(
    (screenPt: Point): Point => {
      const { scale, offset } = layoutRef.current;
      return screenToImage(screenPt, scale, offset);
    },
    []
  );

  const getImagePoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
      let clientX: number, clientY: number;
      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const sp = getScreenPoint(clientX, clientY);
      if (!sp) return null;
      return getImagePointFromScreen(sp);
    },
    [getScreenPoint, getImagePointFromScreen]
  );

  /** Hit-test existing points — returns the closest point source within HIT_RADIUS, or null */
  const hitTestPoints = useCallback(
    (screenPt: Point): DraggablePointSource | null => {
      const { scale, offset } = layoutRef.current;
      let bestDist = HIT_RADIUS;
      let bestSource: DraggablePointSource | null = null;

      // Offside throughPoints (drawn on top, check first)
      for (const line of offsideLinesRef.current) {
        const sp = imageToScreen(line.throughPoint, scale, offset);
        const dist = Math.hypot(sp.x - screenPt.x, sp.y - screenPt.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestSource = { kind: "offside", lineId: line.id };
        }
      }

      // Calibration points (reverse order — later points drawn on top)
      const calPts = calibrationRef.current.points;
      for (let i = calPts.length - 1; i >= 0; i--) {
        const sp = imageToScreen(calPts[i], scale, offset);
        const dist = Math.hypot(sp.x - screenPt.x, sp.y - screenPt.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestSource = { kind: "calibration", index: i };
        }
      }

      return bestSource;
    },
    []
  );

  /** Shared logic for adding a point (calibration or offside) at the given image coords */
  const addPointAtImageCoords = useCallback(
    (imagePoint: Point) => {
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
    [mode, vanishingPoint, offsideLines.length, setCalibration, setVanishingPoint, setMode, setOffsideLines, setParallelError]
  );

  /** Commit a completed drag — update the point position in state */
  const commitDrag = useCallback(
    (drag: DragState) => {
      if (drag.source.kind === "calibration") {
        const idx = drag.source.index;
        setCalibration((prev) => {
          const newPoints = [...prev.points];
          newPoints[idx] = drag.currentPoint;

          let line1 = prev.line1;
          let line2 = prev.line2;

          if (newPoints.length >= 2) {
            line1 = { p1: newPoints[0], p2: newPoints[1] };
          }
          if (newPoints.length >= 4) {
            line2 = { p1: newPoints[2], p2: newPoints[3] };
          }

          // Recompute vanishing point
          if (line1 && line2) {
            const vp = lineIntersection(line1, line2);
            if (vp) {
              setVanishingPoint(vp);
              setParallelError(false);
            } else {
              setParallelError(true);
            }
          }

          return { ...prev, points: newPoints, line1, line2 };
        });
      } else {
        const lineId = drag.source.lineId;
        setOffsideLines((prev) =>
          prev.map((l) =>
            l.id === lineId ? { ...l, throughPoint: drag.currentPoint } : l
          )
        );
      }
    },
    [setCalibration, setVanishingPoint, setOffsideLines, setParallelError]
  );

  // --- Touch handlers (gesture state machine) ---

  const handleCanvasTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      if (e.touches.length >= 2) {
        // Multi-finger → pinch immediately
        pendingTouchRef.current = pendingTouchRef.current
          ? { ...pendingTouchRef.current, gesture: "pinch" }
          : null;
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const screenPt: Point = {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
      const imagePt = getImagePointFromScreen(screenPt);
      const hitTarget = hitTestPoints(screenPt);

      pendingTouchRef.current = {
        screenPoint: screenPt,
        imagePoint: imagePt,
        hitTarget,
        timestamp: Date.now(),
        gesture: "none",
      };
    },
    [canvasRef, getImagePointFromScreen, hitTestPoints]
  );

  const handleCanvasTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const pending = pendingTouchRef.current;
      if (!pending) return;

      // Multi-finger arriving mid-gesture → pinch
      if (e.touches.length >= 2) {
        pending.gesture = "pinch";
        setActiveDrag(null);
        return;
      }

      if (pending.gesture === "pinch") return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const currentScreen: Point = {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };

      const dx = currentScreen.x - pending.screenPoint.x;
      const dy = currentScreen.y - pending.screenPoint.y;
      const dist = Math.hypot(dx, dy);

      if (pending.gesture === "none" && dist > DRAG_THRESHOLD) {
        if (pending.hitTarget) {
          pending.gesture = "drag";
        } else {
          // Moved but not on a point → suppress (treat as scroll/pinch)
          pending.gesture = "pinch";
          return;
        }
      }

      if (pending.gesture === "drag" && pending.hitTarget) {
        const currentImage = getImagePointFromScreen(currentScreen);
        const dragState: DragState = {
          source: pending.hitTarget,
          originalPoint: pending.imagePoint,
          currentPoint: currentImage,
        };
        setActiveDrag(dragState);
      }
    },
    [canvasRef, getImagePointFromScreen]
  );

  const handleCanvasTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const pending = pendingTouchRef.current;
      if (!pending) return;

      // If other fingers still down, wait
      if (e.touches.length > 0) return;

      pendingTouchRef.current = null;
      const dragSnapshot = activeDrag;

      if (pending.gesture === "pinch") {
        setActiveDrag(null);
        return;
      }

      if (pending.gesture === "drag" && dragSnapshot) {
        commitDrag(dragSnapshot);
        setActiveDrag(null);
        return;
      }

      // "none" — no significant movement: treat as tap if quick
      const elapsed = Date.now() - pending.timestamp;
      if (pending.gesture === "none" && elapsed < TAP_MAX_DURATION) {
        // Only add point if we didn't hit an existing point
        if (!pending.hitTarget) {
          addPointAtImageCoords(pending.imagePoint);
        }
      }

      setActiveDrag(null);
    },
    [activeDrag, commitDrag, addPointAtImageCoords]
  );

  // --- Mouse handlers (click + drag) ---

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const sp = getScreenPoint(e.clientX, e.clientY);
      if (!sp) return;
      const hit = hitTestPoints(sp);
      if (hit) {
        mouseDragRef.current = { source: hit, startScreen: sp };
        justDraggedRef.current = false;
      }
    },
    [getScreenPoint, hitTestPoints]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const sp = getScreenPoint(e.clientX, e.clientY);
      if (!sp) return;

      // Mouse drag in progress?
      if (mouseDragRef.current) {
        const dx = sp.x - mouseDragRef.current.startScreen.x;
        const dy = sp.y - mouseDragRef.current.startScreen.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD || justDraggedRef.current) {
          justDraggedRef.current = true;
          const imagePt = getImagePointFromScreen(sp);

          // Get original point
          const src = mouseDragRef.current.source;
          let origPt: Point;
          if (src.kind === "calibration") {
            origPt = calibrationRef.current.points[src.index];
          } else {
            const line = offsideLinesRef.current.find((l) => l.id === src.lineId);
            origPt = line ? line.throughPoint : imagePt;
          }

          setActiveDrag({
            source: src,
            originalPoint: origPt,
            currentPoint: imagePt,
          });
        }
        return;
      }

      // Normal hover preview
      if (mode !== "offside") {
        setHoverImagePoint(null);
        return;
      }
      const imagePoint = getImagePointFromScreen(sp);
      setHoverImagePoint(imagePoint);
    },
    [mode, getScreenPoint, getImagePointFromScreen]
  );

  const handleCanvasMouseUp = useCallback(
    () => {
      if (mouseDragRef.current && justDraggedRef.current && activeDrag) {
        commitDrag(activeDrag);
      }
      mouseDragRef.current = null;
      setActiveDrag(null);
    },
    [activeDrag, commitDrag]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Suppress click if we just finished a drag
      if (justDraggedRef.current) {
        justDraggedRef.current = false;
        return;
      }

      const imagePoint = getImagePoint(e);
      if (!imagePoint) return;

      // Don't add a point if clicking on an existing one
      const sp = getScreenPoint(e.clientX, e.clientY);
      if (sp && hitTestPoints(sp)) return;

      addPointAtImageCoords(imagePoint);
    },
    [getImagePoint, getScreenPoint, hitTestPoints, addPointAtImageCoords]
  );

  const handleCanvasMouseLeave = useCallback(() => {
    setHoverImagePoint(null);
    // Cancel any in-progress mouse drag
    if (mouseDragRef.current) {
      mouseDragRef.current = null;
      setActiveDrag(null);
    }
  }, []);

  return {
    handleCanvasClick,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasMouseLeave,
    handleCanvasTouchStart,
    handleCanvasTouchMove,
    handleCanvasTouchEnd,
    render,
  };
}
