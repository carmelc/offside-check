# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npm run start` — Run production server
- `npm run lint` — Run ESLint (next/core-web-vitals)

No test framework is configured.

## Architecture

Offside is a client-side Next.js 14 app for verifying soccer/football offside calls using vanishing point perspective geometry. Users upload a match screenshot, calibrate two converging lines to find the vanishing point, then draw offside lines through that point.

**Tech stack:** Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS. No backend, no database, no API routes — all processing is in-browser via canvas.

**Path alias:** `@/*` maps to `./src/*`

### App Modes & Flow

The app progresses through three modes (`AppMode` in `src/types/index.ts`):

1. **upload** — Drag-drop image upload (`ImageUploader`)
2. **calibration** — Click 4 points to define 2 converging lines → computes vanishing point via line intersection
3. **offside** — Click to draw lines through the vanishing point; lines extend to canvas bounds

All state lives in `src/app/page.tsx` via `useState` hooks and flows down as props.

### Key Modules

- `src/hooks/useCanvasInteraction.ts` — Central hook handling mouse/touch events, DPR-aware canvas layout, hover preview, and triggering renders
- `src/lib/geometry.ts` — `lineIntersection()` (vanishing point calculation) and `extendLineToBounds()` (line extension to canvas edges)
- `src/lib/canvasRenderer.ts` — All canvas drawing: image overlay, calibration points/lines, vanishing point crosshair, colored offside lines, hover preview
- `src/lib/colors.ts` — 12-color palette that cycles for offside lines

### Rendering Pipeline

`useCanvasInteraction` computes layout and handles input → calls `renderCanvas()` from `canvasRenderer.ts` → uses geometry helpers to extend lines and find intersections. The canvas is DPR-aware and uses ResizeObserver for responsive sizing.
