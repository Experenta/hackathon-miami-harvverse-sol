---
name: convex
description:
    Routes general Convex requests to the right project skill. Use when the user
    asks which Convex skill to use or gives an underspecified Convex app task.
---

# Convex

Use this as the routing skill for Convex work in this repo.

If a more specific Convex skill clearly matches the request, use that instead.

## This Project's Convex Setup

The Convex backend lives at `packages/backend/` (package name `@havverse/backend`).

**Always read `packages/backend/convex/_generated/ai/guidelines.md` first** before writing any Convex code. It contains project-specific rules that override general Convex patterns.

Key commands (run from repo root):

- `pnpm dev:convex` — start the Convex dev watcher
- `pnpm convex:setup` — deploy schema and functions (`convex dev --until-success`)
- `pnpm convex:codegen` — regenerate types

## Route to the Right Skill

Use the most specific Convex skill for the task:

- New project or adding Convex to an app: `../convex-quickstart/SKILL.md`
- Authentication setup: `../convex-setup-auth/SKILL.md`
- Building a reusable Convex component: `../convex-create-component/SKILL.md`
- Planning or running a migration: `../convex-migration-helper/SKILL.md`
- Investigating performance issues: `../convex-performance-audit/SKILL.md`

If one of those clearly matches the user's goal, switch to it instead of staying
in this skill.

## When Not to Use

- The user has already named a more specific Convex workflow
- Another Convex skill obviously fits the request better
