import { list } from "@vercel/blob";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ShareData } from "@/types";
import SharedView from "./SharedView";

async function getShareData(id: string): Promise<ShareData | null> {
  try {
    const { blobs } = await list({ prefix: `shares/${id}/metadata.json` });
    if (blobs.length === 0) return null;

    const response = await fetch(blobs[0].url);
    if (!response.ok) return null;

    return response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getShareData(id);
  if (!data) return { title: "Share Not Found — Offside" };

  return {
    title: `Shared Analysis — Offside`,
    description: `Offside analysis with ${data.offsideLines.length} line${data.offsideLines.length !== 1 ? "s" : ""}`,
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getShareData(id);

  if (!data) {
    notFound();
  }

  return <SharedView data={data} />;
}
