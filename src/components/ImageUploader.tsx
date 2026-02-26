"use client";

import { useCallback, useState, useRef, useEffect } from "react";

interface ImageUploaderProps {
  onImageLoad: (img: HTMLImageElement) => void;
}

function isHeic(file: File): boolean {
  return /^image\/(heic|heif)$/.test(file.type) ||
    /\.heic$/i.test(file.name);
}

export default function ImageUploader({ onImageLoad }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImage = useCallback(
    (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        onImageLoad(img);
      };
      img.src = url;
    },
    [onImageLoad]
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.match(/^image\/(jpeg|png|webp|heic|heif)$/) && !isHeic(file)) {
        return;
      }

      if (isHeic(file)) {
        const heic2any = (await import("heic2any")).default;
        const blob = await heic2any({ blob: file, toType: "image/png" });
        loadImage(Array.isArray(blob) ? blob[0] : blob);
      } else {
        loadImage(file);
      }
    },
    [loadImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFile]);

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[400px]">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center w-full max-w-lg p-12
          border-2 border-dashed rounded-xl cursor-pointer transition-all
          ${
            isDragging
              ? "border-blue-400 bg-blue-500/10 scale-105"
              : "border-gray-600 bg-gray-800/50 hover:border-gray-400 hover:bg-gray-800/80"
          }
        `}
      >
        <svg
          className="w-16 h-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="text-lg font-medium text-gray-200 mb-1">
          Drop or paste a match screenshot here
        </p>
        <p className="text-sm text-gray-400">
          or click to browse (JPEG, PNG, WebP, HEIC)
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Ctrl+V / ⌘V to paste from clipboard
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
