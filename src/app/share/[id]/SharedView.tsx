"use client";

import { useState, useCallback, useEffect } from "react";
import type { ShareData, AppMode, CalibrationState, OffsideLine, Point, ZoomControls } from "@/types";
import OffsideCanvas from "@/components/OffsideCanvas";
import Toolbar from "@/components/Toolbar";
import OffsideLineList from "@/components/OffsideLineList";
import { createShare } from "@/lib/share";
import { copyImageToClipboard, downloadImage } from "@/lib/exportImage";
import Link from "next/link";

interface SharedViewProps {
  data: ShareData;
}

export default function SharedView({ data }: SharedViewProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<AppMode>("offside");
  const [calibration, setCalibration] = useState<CalibrationState>(() => ({
    points: data.calibration.points,
    line1:
      data.calibration.points.length >= 2
        ? { p1: data.calibration.points[0], p2: data.calibration.points[1] }
        : null,
    line2:
      data.calibration.points.length >= 4
        ? { p1: data.calibration.points[2], p2: data.calibration.points[3] }
        : null,
  }));
  const [vanishingPoint, setVanishingPoint] = useState<Point | null>(data.vanishingPoint);
  const [offsideLines, setOffsideLines] = useState<OffsideLine[]>(data.offsideLines);
  const [parallelError, setParallelError] = useState(false);
  const [zoomControls, setZoomControls] = useState<ZoomControls | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  // Load image from blob URL
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = data.imageUrl;
  }, [data.imageUrl]);

  const handleResetCalibration = useCallback(() => {
    setMode("calibration");
    setCalibration({ points: [], line1: null, line2: null });
    setVanishingPoint(null);
    setOffsideLines([]);
    setParallelError(false);
  }, []);

  const handleClearOffsideLines = useCallback(() => {
    setOffsideLines([]);
  }, []);

  const handleDeleteLine = useCallback((id: string) => {
    setOffsideLines((prev) => prev.filter((l) => l.id !== id));
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
  }, [image, calibration, vanishingPoint, offsideLines]);

  const exportParams = image && vanishingPoint ? { image, calibration, vanishingPoint, offsideLines } : null;

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
      <header className="flex-shrink-0 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-blue-400">&#9917;</span> Offside
            </h1>
            <span className="text-xs text-gray-500 hidden sm:inline">
              Shared Analysis
            </span>
          </div>
          {image && (
            <Toolbar
              mode={mode}
              calibrationPointCount={calibration.points.length}
              hasVanishingPoint={!!vanishingPoint}
              offsideLineCount={offsideLines.length}
              parallelError={parallelError}
              onResetCalibration={handleResetCalibration}
              onClearOffsideLines={handleClearOffsideLines}
              onResetAll={handleResetCalibration}
              zoomControls={zoomControls}
              onShare={handleShare}
              isSharing={isSharing}
              onCopyImage={handleCopyImage}
              onDownloadImage={handleDownloadImage}
            />
          )}
        </div>
      </header>

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

      <div className="flex-1 flex overflow-hidden">
        {image ? (
          <>
            <div className="flex-1 relative">
              <OffsideCanvas
                image={image}
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

            <aside className="w-64 flex-shrink-0 border-l border-gray-800 p-4 overflow-y-auto hidden md:block">
              <div className="text-sm text-gray-400 mb-4">
                <p>Click to add offside lines. Drag points to adjust.</p>
              </div>

              {offsideLines.length > 0 && (
                <div className="mt-2">
                  <OffsideLineList
                    lines={offsideLines}
                    onDelete={handleDeleteLine}
                  />
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-800">
                <Link
                  href="/"
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Try with your own image &rarr;
                </Link>
              </div>
            </aside>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-gray-500">Loading image...</span>
          </div>
        )}
      </div>
    </div>
  );
}
