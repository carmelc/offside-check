"use client";

import { AppMode, ZoomControls } from "@/types";

interface ToolbarProps {
  mode: AppMode;
  calibrationPointCount: number;
  hasVanishingPoint: boolean;
  offsideLineCount: number;
  parallelError: boolean;
  onResetCalibration: () => void;
  onClearOffsideLines: () => void;
  onResetAll: () => void;
  zoomControls?: ZoomControls | null;
}

export default function Toolbar({
  mode,
  calibrationPointCount,
  hasVanishingPoint,
  offsideLineCount,
  parallelError,
  onResetCalibration,
  onClearOffsideLines,
  onResetAll,
  zoomControls,
}: ToolbarProps) {
  if (mode === "upload") return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Status */}
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            hasVanishingPoint ? "bg-green-400" : "bg-yellow-400"
          }`}
        />
        <span className="text-sm text-gray-300">
          {mode === "calibration" && !parallelError && (
            <>Calibrating ({calibrationPointCount}/4 points)</>
          )}
          {parallelError && (
            <span className="text-red-400">
              Lines are parallel - no vanishing point found
            </span>
          )}
          {mode === "offside" && (
            <>
              Offside mode - {offsideLineCount} line
              {offsideLineCount !== 1 && "s"}
            </>
          )}
        </span>
      </div>

      {/* Zoom controls */}
      {zoomControls && (
        <div className="flex items-center gap-1">
          <button
            onClick={zoomControls.zoomOut}
            disabled={zoomControls.zoomLevel <= 1}
            className="w-8 h-8 flex items-center justify-center text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            &minus;
          </button>
          <span className="text-xs text-gray-400 w-12 text-center tabular-nums">
            {Math.round(zoomControls.zoomLevel * 100)}%
          </span>
          <button
            onClick={zoomControls.zoomIn}
            disabled={zoomControls.zoomLevel >= 5}
            className="w-8 h-8 flex items-center justify-center text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +
          </button>
          <button
            onClick={zoomControls.resetView}
            className="px-2 h-8 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors ml-1"
          >
            Fit
          </button>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Buttons */}
      {(parallelError || mode === "offside") && (
        <button
          onClick={onResetCalibration}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
        >
          Reset Calibration
        </button>
      )}

      {mode === "offside" && offsideLineCount > 0 && (
        <button
          onClick={onClearOffsideLines}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
        >
          Clear All Lines
        </button>
      )}

      <button
        onClick={onResetAll}
        className="px-3 py-1.5 text-sm bg-red-900/50 hover:bg-red-800/50 text-red-300 rounded-lg transition-colors"
      >
        New Image
      </button>
    </div>
  );
}
