# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**easy-peasy-ease** is a client-side web application that generates seamless orbital/rotating camera effect videos from a single image. The workflow:

1. User uploads an image
2. Generate multiple camera angles using Qwen Image Edit API
3. Generate smooth transition videos between angles using Kling video generation
4. Apply ease-in-out speed curves to create organic motion
5. Stitch videos together with background music
6. Download final MP4 video

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4 + PostCSS + CSS Variables for theming
- **UI Elements**: Lucide React icons, Class Variance Authority for components
- **Client-side Processing**: Mediabunny (video processing library)
- **External APIs**:
  - Replicate API (Qwen for angle generation, Kling for video generation)
  - Mediabunny (video stitching, speed curves, audio mixing)

## Key Architecture

### Client-Side Processing
All video encoding and processing happens in the browser using Mediabunny. No server-side video encoding is needed. Data is stored in-memory only (session-based, no persistent storage).

### Critical Feature: Seamless Loop
The videos must loop continuously without interruption. This requires:
- Each transition video starts where the previous one ends
- Last video ends on the first angle image (frame-perfect)
- Speed curves applied without frame interpolation
- Duration target: 1.5 seconds per video segment with ease-in-out timing

### Styling Architecture
- **CSS Variables**: OkLCH color space definitions for theming (primary, secondary, accent, destructive, sidebar, chart colors)
- **Dark Mode**: Automatic via `.dark` class wrapper
- **Utility-First**: Tailwind CSS with custom animations via `tw-animate-css`
- **Class Merging**: Use `cn()` utility from `lib/utils.ts` to merge Tailwind classes and resolve conflicts

### Path Aliases
Configured in `tsconfig.json`: `@/*` points to repository root for clean imports

## Common Commands

```bash
# Development
npm run dev           # Start dev server (http://localhost:3000)

# Production
npm run build        # Build for production
npm start            # Start production server

# Code Quality
npm run lint         # Run ESLint on the codebase
```

## Project Structure

```
app/                 # Next.js pages and layouts (App Router)
├── layout.tsx       # Root layout with fonts and metadata
├── page.tsx         # Main homepage
└── globals.css      # Tailwind CSS with theming variables

lib/                 # Utilities
└── utils.ts         # cn() function for class merging

docs/                # Reference documentation
├── PRD-and-implementation-plan.md  # Product requirements
├── qwen-docs.md     # Qwen Image Edit API reference
├── kling-docs.md    # Kling v2.1 video generation reference
└── mediabunny.md    # Mediabunny processing library docs

public/              # Static assets (SVGs, icons)
```

## Important Implementation Notes

### API Integration
- Replicate API tokens are stored in session state (never persisted)
- Two-stage processing: angles first (Qwen), then transitions (Kling)
- Plan for concurrent video generation with rate limiting

### Video Processing Flow
1. **Generate Angles**: Qwen creates multiple camera viewpoints from single image
2. **Generate Transitions**: Kling creates smooth videos between consecutive angles
3. **Apply Speed Curves**: Mediabunny remaps video timestamps with ease-in-out function
4. **Stitch Together**: Concatenate all videos maintaining seamless transitions
5. **Mix Audio**: Combine background music with video in final output

### Styling Patterns
- Always use the `cn()` utility when combining Tailwind classes dynamically
- CSS variables are pre-defined in `globals.css` for consistent theming
- Components should support dark mode through `.dark` class
- Use Chart colors (chart-1 through chart-5) for data visualization

### Component Development
- **Always use shadcn/ui components** whenever possible instead of building custom components
- Every time you are asked to create new UI elements, use the ShadCN mcp tools.
- Check the shadcn MCP server for available shadcn components and their implementation details before creating new UI elements
- If a shadcn component doesn't exist for a use case, only then build a custom component
- Install shadcn components using `npx shadcn-ui@latest add <component-name>` in the `components/ui/` directory
- Use Lucide React icons from the shadcn ecosystem for consistency

### Data Handling
- No database - all processing is temporary and in-memory
- User provides Replicate API token at runtime
- Generated videos are stored in browser memory, then downloaded
- No localStorage usage by design

## References for Development

Check these documentation files for API details:
- `docs/PRD-and-implementation-plan.md` - Full product specification and implementation details
- `docs/qwen-docs.md` - Qwen Image Edit model parameters and responses
- `docs/kling-docs.md` - Kling video generation API reference
- `docs/mediabunny.md` - Client-side video processing library documentation

## ESLint Configuration

Uses Next.js recommended ESLint rules (`eslint-config-next`). Run `npm run lint` to check for issues.
