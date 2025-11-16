# Repository Guidelines

## Project Overview
- **easy-peasy-ease** generates seamless orbital camera videos from a single image by chaining Qwen image edits, Kling transitions, Mediabunny easing, and audio stitching entirely in the browser.
- Flow: upload an image -> generate multiple angles (Qwen via Replicate) -> create transition clips (Kling) -> remap timing with ease-in-out curves -> stitch clips with background music -> download the MP4.

## Tech Stack & Architecture
- Next.js 16 App Router with React 19 + TypeScript 5; all video processing happens client-side with Mediabunny, so never add server-side encoding or persistence.
- Styling runs on Tailwind CSS 4, PostCSS, and CSS variables (OkLCH palette) with `.dark` providing automatic dark mode; use chart color tokens for visualizations.
- Merge dynamic class names with the `cn()` helper from `@/lib/utils`, and lean on Lucide React icons plus shadcn/ui primitives for consistent UI.
- Replicate API powers Qwen (angle generation) and Kling (transitions); Mediabunny handles speed curves, video concatenation, and audio mixing. Keep the two-stage prediction flow (angles first, transitions second) and respect rate limits.
- Path alias `@/*` is defined in `tsconfig.json`; prefer aliased imports for shared utilities and types.

## Project Structure & Module Organization
- `app/`: Next.js entry point (`layout.tsx`, `page.tsx`), shared styles in `globals.css`, and the Replicate proxy route in `app/api/replicate-proxy/route.ts`.
- `components/`: Feature composites (uploaders, dialogs, previews) plus shadcn primitives inside `components/ui/`; keep helper logic next to consuming components.
- `hooks/`: Client hooks coordinating Replicate + Mediabunny flows (`useReplicateAPI`, `useFinalizeVideo`, `useStitchVideos`); compose them instead of rewriting async orchestration.
- `lib/`: Domain configs, easing curves, and TypeScript types reused across the app.
- `docs/` and `public/`: Product briefs, API references (`qwen-docs`, `kling-docs`, `mediabunny`), and static assets referenced in marketing or demos.

## Workflow Requirements
- All media and token data stay in session memory. Do not introduce localStorage, IndexedDB, or any persistent storage layers.
- Seamless-loop contract: each transition must start where the previous ends, the final frame must match the first angle, and each segment should target ~1.5 seconds with ease-in-out curves applied without frame interpolation.
- Keep Mediabunny responsible for easing, timestamp remapping, and stitching so frame alignment stays exact.

## UI & Styling Patterns
- Compose UI with Tailwind utilities plus shadcn/ui primitives. Install new primitives via `npx shadcn-ui@latest add <component>` and keep them under `components/ui/`.
- Before building custom UI, consult the shadcn MCP server for available components; only author bespoke elements when no shadcn option exists.
- Reuse CSS variables from `globals.css`, honor dark mode by wrapping components in `.dark`, and keep new animations within the existing `tw-animate-css` setup.

## Build, Test, and Development Commands
- `npm run dev`: Start the Next.js dev server (`http://localhost:3000`) with hot reload; supply a Replicate token before exercising uploads.
- `npm run build`: Produce the production bundle and catch type or lint issues during compilation.
- `npm run start`: Serve the latest build for parity checks with Vercel.
- `npm run lint`: Apply the repo ESLint preset (core web vitals + TS); must pass before any push or PR.

## Coding Style & Naming Conventions
- Use TypeScript + React 19 patterns; mark files with `"use client"` only when browser APIs or stateful hooks are required.
- Prefer 2-space indentation, single quotes, arrow callbacks, and named exports for shareable pieces.
- Keep filenames in `kebab-case.tsx`; hooks follow `useThing.ts`, and shared contracts belong in `lib/types.ts`.

## Testing Guidelines
- No automated suite ships yet; add focused component or hook tests using React Testing Library + Vitest (or Jest) under mirrored `__tests__` folders when you touch shared logic.
- Mock fetch/polling for Replicate flows to keep optimistic UI states deterministic.
- Run `npm run lint` plus a manual walkthrough via `npm run dev`, noting bespoke prerequisites (tokens, uploads) in PR checklists.

## Commit & Pull Request Guidelines
- Write short, present-tense subjects (<=60 chars) such as `feat: add video stitcher`, then add detail in the body for API or hook updates.
- PRs must summarize scope, link issues, enumerate tests, and include screenshots or clips for UI-impacting work.
- Highlight required config (`.env.local` with `REPLICATE_API_TOKEN`, storage paths, feature flags) so reviewers can reproduce quickly.

## Security & Data Handling
- Never hard-code Replicate tokens; load them via `.env.local` or secure user input, and keep logs free of secrets (see `app/api/replicate-proxy/route.ts`).
- Tokens and prediction identifiers live only in session state; scrub user media URLs and prediction IDs when sharing logs or repro steps.
- Avoid permanent storage for generated assets; keep everything ephemeral until download.
