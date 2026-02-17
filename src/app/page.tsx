"use client";

import { useState, useCallback } from "react";
import { AppMode, CalibrationState, OffsideLine, Point, ZoomControls } from "@/types";
import ImageUploader from "@/components/ImageUploader";
import OffsideCanvas from "@/components/OffsideCanvas";
import Toolbar from "@/components/Toolbar";
import Instructions from "@/components/Instructions";
import OffsideLineList from "@/components/OffsideLineList";

const INITIAL_CALIBRATION: CalibrationState = {
  points: [],
  line1: null,
  line2: null,
};

export default function Home() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<AppMode>("upload");
  const [calibration, setCalibration] =
    useState<CalibrationState>(INITIAL_CALIBRATION);
  const [vanishingPoint, setVanishingPoint] = useState<Point | null>(null);
  const [offsideLines, setOffsideLines] = useState<OffsideLine[]>([]);
  const [parallelError, setParallelError] = useState(false);
  const [zoomControls, setZoomControls] = useState<ZoomControls | null>(null);

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    setImage(img);
    setMode("calibration");
    setCalibration(INITIAL_CALIBRATION);
    setVanishingPoint(null);
    setOffsideLines([]);
    setParallelError(false);
  }, []);

  const handleResetCalibration = useCallback(() => {
    setMode("calibration");
    setCalibration(INITIAL_CALIBRATION);
    setVanishingPoint(null);
    setOffsideLines([]);
    setParallelError(false);
  }, []);

  const handleClearOffsideLines = useCallback(() => {
    setOffsideLines([]);
  }, []);

  const handleResetAll = useCallback(() => {
    setImage(null);
    setMode("upload");
    setCalibration(INITIAL_CALIBRATION);
    setVanishingPoint(null);
    setOffsideLines([]);
    setParallelError(false);
  }, []);

  const handleDeleteLine = useCallback((id: string) => {
    setOffsideLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-blue-400">⚽</span> Offside
            </h1>
            <span className="text-xs text-gray-500 hidden sm:inline">
              Vanishing Point Tool
            </span>
          </div>
          {mode !== "upload" && (
            <Toolbar
              mode={mode}
              calibrationPointCount={calibration.points.length}
              hasVanishingPoint={!!vanishingPoint}
              offsideLineCount={offsideLines.length}
              parallelError={parallelError}
              onResetCalibration={handleResetCalibration}
              onClearOffsideLines={handleClearOffsideLines}
              onResetAll={handleResetAll}
              zoomControls={zoomControls}
            />
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {mode === "upload" ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <ImageUploader onImageLoad={handleImageLoad} />
          </div>
        ) : (
          <>
            {/* Canvas area */}
            <div className="flex-1 relative">
              <OffsideCanvas
                image={image!}
                mode={mode}
                setMode={setMode}
                calibration={calibration}
                setCalibration={setCalibration}
                vanishingPoint={vanishingPoint}
                setVanishingPoint={setVanishingPoint}
                offsideLines={offsideLines}
                setOffsideLines={setOffsideLines}
                parallelError={parallelError}
                setParallelError={setParallelError}
                onZoomControlsReady={setZoomControls}
              />
            </div>

            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 border-l border-gray-800 p-4 overflow-y-auto hidden md:block">
              <Instructions
                mode={mode}
                calibrationPointCount={calibration.points.length}
                parallelError={parallelError}
              />

              {offsideLines.length > 0 && (
                <div className="mt-6">
                  <OffsideLineList
                    lines={offsideLines}
                    onDelete={handleDeleteLine}
                  />
                </div>
              )}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
