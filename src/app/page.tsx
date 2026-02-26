"use client";

import { useState, useCallback } from "react";
import { AppMode, CalibrationState, OffsideLine, CustomLine, Point, ZoomControls } from "@/types";
import { CUSTOM_LINE_COLORS } from "@/lib/colors";
import ImageUploader from "@/components/ImageUploader";
import OffsideCanvas from "@/components/OffsideCanvas";
import Toolbar from "@/components/Toolbar";
import Instructions from "@/components/Instructions";
import OffsideLineList from "@/components/OffsideLineList";
import CustomLineList from "@/components/CustomLineList";
import { createShare } from "@/lib/share";
import { copyImageToClipboard, downloadImage } from "@/lib/exportImage";

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
  const [customLines, setCustomLines] = useState<CustomLine[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    setImage(img);
    setMode("calibration");
    setCalibration(INITIAL_CALIBRATION);
    setVanishingPoint(null);
    setOffsideLines([]);
    setCustomLines([]);
    setIsDrawingMode(false);
    setParallelError(false);
  }, []);

  const handleResetCalibration = useCallback(() => {
    setMode("calibration");
    setCalibration(INITIAL_CALIBRATION);
    setVanishingPoint(null);
    setOffsideLines([]);
    setCustomLines([]);
    setIsDrawingMode(false);
    setParallelError(false);
  }, []);

  const handleClearOffsideLines = useCallback(() => {
    setOffsideLines([]);
    setCustomLines([]);
  }, []);

  const handleResetAll = useCallback(() => {
    setImage(null);
    setMode("upload");
    setCalibration(INITIAL_CALIBRATION);
    setVanishingPoint(null);
    setOffsideLines([]);
    setCustomLines([]);
    setIsDrawingMode(false);
    setParallelError(false);
  }, []);

  const handleDeleteLine = useCallback((id: string) => {
    setOffsideLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleUpdateOffsideLineColor = useCallback((id: string, color: string) => {
    setOffsideLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, color } : l))
    );
  }, []);

  const handleDeleteCustomLine = useCallback((id: string) => {
    setCustomLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleUpdateCustomLineColor = useCallback((id: string, color: string) => {
    setCustomLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, color } : l))
    );
  }, []);

  const handleToggleDrawingMode = useCallback(() => {
    setIsDrawingMode((prev) => !prev);
  }, []);

  const handleShare = useCallback(async () => {
    if (!image || !vanishingPoint) return;
    setIsSharing(true);
    setShareStatus(null);
    try {
      const result = await createShare({
        image,
        calibration,
        vanishingPoint,
        offsideLines,
        customLines,
      });
      const fullUrl = `${window.location.origin}${result.url}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
        setShareStatus("Link copied!");
      } else {
        window.prompt("Copy this link:", fullUrl);
        setShareStatus("Link ready!");
      }
      setTimeout(() => setShareStatus(null), 3000);
    } catch (err) {
      console.error("Share failed:", err);
      setShareStatus("Share failed");
      setTimeout(() => setShareStatus(null), 3000);
    } finally {
      setIsSharing(false);
    }
  }, [image, calibration, vanishingPoint, offsideLines, customLines]);

  const exportParams = image && vanishingPoint ? { image, calibration, vanishingPoint, offsideLines, customLines } : null;

  const handleCopyImage = useCallback(async () => {
    if (!exportParams) return;
    try {
      await copyImageToClipboard(exportParams);
      setShareStatus("Image copied!");
      setTimeout(() => setShareStatus(null), 3000);
    } catch (err) {
      console.error("Copy failed:", err);
      setShareStatus("Copy failed");
      setTimeout(() => setShareStatus(null), 3000);
    }
  }, [exportParams]);

  const handleDownloadImage = useCallback(async () => {
    if (!exportParams) return;
    try {
      await downloadImage(exportParams);
    } catch (err) {
      console.error("Download failed:", err);
      setShareStatus("Download failed");
      setTimeout(() => setShareStatus(null), 3000);
    }
  }, [exportParams]);

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
              onShare={handleShare}
              isSharing={isSharing}
              onCopyImage={handleCopyImage}
              onDownloadImage={handleDownloadImage}
              isDrawingMode={isDrawingMode}
              onToggleDrawingMode={handleToggleDrawingMode}
            />
          )}
        </div>
      </header>

      {/* Share status banner */}
      {shareStatus && (
        <div
          className={`flex-shrink-0 px-4 py-2 text-sm text-center ${
            shareStatus === "Share failed"
              ? "bg-red-900/50 text-red-300"
              : "bg-green-900/50 text-green-300"
          }`}
        >
          {shareStatus}
        </div>
      )}

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
                customLines={customLines}
                setCustomLines={setCustomLines}
                isDrawingMode={isDrawingMode}
                drawingColor={CUSTOM_LINE_COLORS[0]}
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
                    onColorChange={handleUpdateOffsideLineColor}
                  />
                </div>
              )}

              {customLines.length > 0 && (
                <div className="mt-6">
                  <CustomLineList
                    lines={customLines}
                    onDelete={handleDeleteCustomLine}
                    onColorChange={handleUpdateCustomLineColor}
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
