import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import type { ShareData, Point, OffsideLine } from "@/types";

const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB

interface ShareMetadata {
  calibration: { points: Point[] };
  vanishingPoint: Point;
  offsideLines: OffsideLine[];
  imageWidth: number;
  imageHeight: number;
}

function isValidPoint(p: unknown): p is Point {
  return (
    typeof p === "object" &&
    p !== null &&
    typeof (p as Point).x === "number" &&
    typeof (p as Point).y === "number"
  );
}

function isValidMetadata(data: unknown): data is ShareMetadata {
  if (typeof data !== "object" || data === null) return false;
  const d = data as ShareMetadata;

  if (
    !d.calibration ||
    !Array.isArray(d.calibration.points) ||
    d.calibration.points.length !== 4 ||
    !d.calibration.points.every(isValidPoint)
  )
    return false;

  if (!isValidPoint(d.vanishingPoint)) return false;

  if (!Array.isArray(d.offsideLines)) return false;
  for (const line of d.offsideLines) {
    if (
      typeof line.id !== "string" ||
      typeof line.color !== "string" ||
      !isValidPoint(line.throughPoint)
    )
      return false;
  }

  if (typeof d.imageWidth !== "number" || typeof d.imageHeight !== "number")
    return false;

  return true;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const metadataStr = formData.get("metadata") as string | null;

    if (!image || !metadataStr) {
      return NextResponse.json(
        { error: "Missing image or metadata" },
        { status: 400 }
      );
    }

    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image exceeds 1MB limit" },
        { status: 400 }
      );
    }

    let metadata: ShareMetadata;
    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      return NextResponse.json(
        { error: "Invalid metadata JSON" },
        { status: 400 }
      );
    }

    if (!isValidMetadata(metadata)) {
      return NextResponse.json(
        { error: "Invalid metadata structure" },
        { status: 400 }
      );
    }

    const id = nanoid(10);

    // Upload image to Vercel Blob
    const imageBlob = await put(`shares/${id}/image.jpg`, image, {
      access: "public",
      addRandomSuffix: false,
    });

    // Build ShareData and upload as JSON
    const shareData: ShareData = {
      id,
      imageUrl: imageBlob.url,
      calibration: metadata.calibration,
      vanishingPoint: metadata.vanishingPoint,
      offsideLines: metadata.offsideLines,
      imageWidth: metadata.imageWidth,
      imageHeight: metadata.imageHeight,
    };

    await put(
      `shares/${id}/metadata.json`,
      JSON.stringify(shareData),
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
      }
    );

    return NextResponse.json({ id, url: `/share/${id}` });
  } catch (error) {
    console.error("Share creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create share" },
      { status: 500 }
    );
  }
}
