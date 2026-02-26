"use client";

import { useState } from "react";
import { CustomLine } from "@/types";
import { CUSTOM_LINE_COLORS } from "@/lib/colors";

interface CustomLineListProps {
  lines: CustomLine[];
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
}

export default function CustomLineList({ lines, onDelete, onColorChange }: CustomLineListProps) {
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);

  if (lines.length === 0) return null;

  return (
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-gray-300 mb-2">Custom Lines</h3>
      {lines.map((line, i) => (
        <div
          key={line.id}
          className="relative flex items-center gap-2 group px-2 py-1 rounded hover:bg-gray-800/50"
        >
          <button
            onClick={() =>
              setOpenPickerId(openPickerId === line.id ? null : line.id)
            }
            className="w-4 h-4 rounded-sm flex-shrink-0 border border-gray-600 hover:border-gray-400 transition-colors"
            style={{ backgroundColor: line.color }}
            title="Change color"
          />
          <span className="text-sm text-gray-300 flex-1">Line {i + 1}</span>
          <button
            onClick={() => onDelete(line.id)}
            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
            title="Delete line"
          >
            &times;
          </button>

          {openPickerId === line.id && (
            <div className="absolute left-0 top-full mt-1 z-10 bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg">
              <div className="grid grid-cols-4 gap-1.5">
                {CUSTOM_LINE_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onColorChange(line.id, color);
                      setOpenPickerId(null);
                    }}
                    className={`w-6 h-6 rounded-sm border-2 transition-colors ${
                      line.color === color
                        ? "border-white"
                        : "border-transparent hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
