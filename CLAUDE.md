# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Official website for "Lumos," a programming circle at Yokohama National University. The UI and documentation are in Japanese.

## Commands

```bash
# Development (auto-starts Firestore emulator if not running)
just dev

# Testing (runs Vitest with Firestore emulator)
just test

# Run a single test file
pnpm exec firebase emulators:exec --only firestore "vitest run lib/firebase.test.ts"

# Linting & formatting
just lint            # ESLint
just format          # Prettier
just format-check    # Prettier check only

# Build
just build           # Production build

# Firestore emulator management
just emulator        # Start in background
just emulator-stop   # Stop
just emulator-reset  # Restart (clears data)
```

Use `pnpm exec firebase` instead of global `firebase` CLI (Node.js compatibility issue).

Tests require the Firestore emulator. `just test` wraps `firebase emulators:exec`, which starts/stops the emulator automatically. Test files live alongside their source (e.g., `lib/firebase.test.ts`, `lib/mini-lt/utils.test.ts`).

## Tech Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript 5.9**
- **NextAuth.js v5** (beta) for Discord OAuth authentication
- **Firestore** (Firebase Admin SDK) as database
- **Tailwind CSS 3** + **shadcn/ui** (Radix UI) for styling
- **Vitest** for testing with Firestore Emulator
- **pnpm** as package manager, **just** as task runner
- Deployed to **Google Cloud Run** via GitHub Actions

## Architecture

### Routing (`app/`)

- `app/page.tsx` — Public landing page
- `app/news/` — Public news/announcements
- `app/members/` — Public member directory
- `app/mini-lt/` — Mini LT (Lightning Talk) event management with admin panel
- `app/internal/` — Protected member area (requires Discord auth)
  - `(protected)/` — Route group for authenticated pages (profile, members, settings, events)
  - `onboarding/` — New member onboarding flow
- `app/api/` — API routes for profile, events, onboarding, Discord integration, OAuth linking

### Key Modules

- `lib/auth.ts` — NextAuth config: Discord OAuth, JWT callbacks, admin role detection via Discord guild membership
- `lib/firebase.ts` — Firestore initialization and helpers; uses emulator in dev (`FIRESTORE_EMULATOR_HOST`)
- `lib/members.ts` — Member CRUD operations against Firestore
- `lib/discord.ts` — Discord API integration (guild validation, event creation)
- `lib/mini-lt/` — Mini LT module: Firestore ops (`firebase.ts`), utility functions (`utils.ts`), LINE Flex messages (`line-flex.ts`)
- `lib/mini-lt/actions/` — Server Actions (`"use server"`): `discord-events.ts` (Discord event creation), `line.ts` (LINE push notifications)
- `types/` — Shared TypeScript types (member, profile, event, interests, next-auth session augmentation)

### Component Patterns

- Server Components by default; `"use client"` only for interactive components
- `components/ui/` — shadcn/ui primitives (30+ components)
- `components/mini-lt/` — Mini LT-specific components
- Forms use `react-hook-form` + `zod` for validation
- `cn()` utility (clsx + tailwind-merge) for className composition

### Authentication Flow

Discord OAuth login → JWT token with guild/admin info → Firestore member record. Protected routes under `app/internal/` redirect unauthenticated users to Discord login. Admin role is detected by checking Discord guild roles (via `ADMIN_ROLE_ID`). Secondary OAuth linking (GitHub, X, LINE) uses dedicated API routes under `app/api/auth/link/`.

### External Integrations

- **Discord**: OAuth, guild membership validation, bot-driven event creation
- **LINE**: Account linking, push notifications for LT events
- **Google Cloud Storage**: Profile image uploads
- **GitHub/X**: Account linking for member profiles

## Code Conventions

- Path alias: `@/*` maps to project root
- Commit messages: Japanese with emoji prefix (e.g., `✨ 機能追加`, `🐛 バグ修正`)
- ESLint rule: unused vars must be prefixed with `_`
- Pre-commit hook (Husky): runs eslint --fix + prettier --write on staged files
- `next.config.ts` has `ignoreBuildErrors: true` and `output: "standalone"` for Cloud Run
- Design system documented in `DESIGN_GUIDELINES.md`
- Environment setup: copy `.env.example` to `.env.local` and fill in values
