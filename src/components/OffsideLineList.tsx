"use client";

import { OffsideLine } from "@/types";

interface OffsideLineListProps {
  lines: OffsideLine[];
  onDelete: (id: string) => void;
}

export default function OffsideLineList({ lines, onDelete }: OffsideLineListProps) {
  if (lines.length === 0) return null;

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-gray-300 mb-2">Offside Lines</h3>
      {lines.map((line, i) => (
        <div
          key={line.id}
          className="flex items-center gap-2 group px-2 py-1 rounded hover:bg-gray-800/50"
        >
          <div
            className="w-4 h-4 rounded-sm flex-shrink-0"
            style={{ backgroundColor: line.color }}
          />
          <span className="text-sm text-gray-300 flex-1">Line {i + 1}</span>
          <button
            onClick={() => onDelete(line.id)}
            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
            title="Delete line"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
