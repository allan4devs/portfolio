# Comp storage

MongoDB stores category definitions in `comp_categories`; `/api/comp` reads these documents to build the directory tabs. The first load seeds missing definitions from `lib/comp/categories.ts` with stable IDs, and later requests use MongoDB as the source of truth. Each `comp_companies` document stores its matching category keys, including model, nearshore, hiring evidence, technologies, roles, seniority, and job types. Account-scoped `comp_preferences` stores `likes` or `dislikes`; reactions remain mutually exclusive. The `categories-v2` migration refreshes company category assignments and backfills preference categories on the next API load. Undo removes the reaction category, and careers-link edits preserve it.

Comp reads its catalog from `comp_companies` in the existing MongoDB database (`MONGODB_URI`, optional `MONGODB_DB`, default `lva`). On the first API request, the existing catalog and its role/source evidence are imported with stable company IDs. The `comp_migrations` collection records completion; retries do not overwrite existing companies. The bootstrap JSON and catalog builder live under `lib/comp`; they are only used to initialize MongoDB and by the research scripts. The route folder contains only its page and UI.

Likes, dislikes, and edited careers links are saved in browser storage when signed out or when MongoDB is unavailable. Signed-in admins sync preferences to `comp_preferences`, scoped to their account. API writes require the admin session and reject cross-origin requests.

On the first signed-in visit, browser preferences under `cv-company-preferences-v1` are imported without overwriting existing MongoDB preferences. Browser data is removed only after a successful import. If it fails, reload to retry. Other devices use the same saved preferences when signed in to the same account.

The directory exposes category tabs derived from company evidence. Counts exclude dislikes from browsing categories and preserve the existing Companies/Like separation. Search and filters apply within each category. Results are paginated, with 12, 24, or 48 companies per page.

Validation: `node scripts/check-comp-storage.cjs` checks catalog import, preference ownership, non-destructive migration, reaction exclusivity, URL validation, API authentication, and origin checks with an in-memory database. Live migration requires configured MongoDB credentials.

`node scripts/check-comp-reactions.cjs` checks guest reaction controls, persistence after reload, saved tabs, and undo with a component hook harness.
