"use client";

import { AppMode } from "@/types";

interface InstructionsProps {
  mode: AppMode;
  calibrationPointCount: number;
  parallelError: boolean;
}

export default function Instructions({
  mode,
  calibrationPointCount,
  parallelError,
}: InstructionsProps) {
  if (mode === "upload") return null;

  const steps = [
    {
      label: "Click 2 points on the first pitch line",
      done: calibrationPointCount >= 2,
      active: mode === "calibration" && calibrationPointCount < 2,
      color: "cyan",
    },
    {
      label: "Click 2 points on the second pitch line",
      done: calibrationPointCount >= 4,
      active: mode === "calibration" && calibrationPointCount >= 2 && calibrationPointCount < 4,
      color: "magenta",
    },
    {
      label: "Click to draw offside lines",
      done: false,
      active: mode === "offside",
      color: "green",
    },
  ];

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div
          key={i}
          className={`flex items-center gap-2 text-sm transition-opacity ${
            step.active
              ? "opacity-100"
              : step.done
              ? "opacity-50"
              : "opacity-30"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border ${
              step.done
                ? "border-green-400 text-green-400"
                : step.active
                ? "border-white text-white"
                : "border-gray-600 text-gray-600"
            }`}
          >
            {step.done ? "✓" : i + 1}
          </div>
          <span
            className={
              step.active ? "text-gray-100 font-medium" : "text-gray-400"
            }
          >
            {step.label}
          </span>
          {step.active && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor:
                  step.color === "cyan"
                    ? "#00FFFF"
                    : step.color === "magenta"
                    ? "#FF00FF"
                    : "#44FF44",
              }}
            />
          )}
        </div>
      ))}
      {parallelError && (
        <p className="text-red-400 text-sm mt-2">
          The two lines appear to be parallel. Click &quot;Reset Calibration&quot; and
          try again with lines that converge toward the vanishing point.
        </p>
      )}
    </div>
  );
}
