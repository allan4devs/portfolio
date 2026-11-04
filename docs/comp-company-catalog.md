# Comp: 1,000-company catalog

The standalone `/comp` catalog reached **1,000 deduplicated companies** on October 29, 2026, using the existing collection as its base. Duplicate names, confirmed rebrands, and an unnamed recruiter placeholder are merged or excluded. Existing company keys are retained through aliases so saved preferences can migrate.

## Coverage

- 878 companies have evidence for at least one primary target: Java, React, Python, or Node.js.
- Java: 426; React: 635; Python: 457; Node.js: 322. A company may match several technologies.
- Full stack: 403; backend: 193; frontend: 143.
- 33 companies have explicit mid-level signals. Unknown seniority is left unknown.
- The 50-company Nearshore collection remains available.

These are company-level signals, not 1,000 guaranteed current vacancies. Region and technology information attributed to historical directory profiles may be outdated. Each imported card includes its profile source, checked official source, and check date; employer role feeds provide additional evidence. Country restrictions belong to individual postings.

## Research and reproduction

The research reviewed 1,024 profiles and 261 public employer boards. The source inputs and response metadata are in `output/comp-*.json`; the published bootstrap records are in `lib/comp/data/expanded-companies.json` and `employer-roles.json`. `catalog-summary.json` records aggregate counts. License attribution is in `docs/comp/DATA-SOURCES.md`.

1. Download Remote In Tech at commit `fa2253f1ed02cc4d8f59ab3ccc831b008cdd7189` into `output/remoteintech-source`.
2. Run `node scripts/import-comp-expansion.cjs --prepare` to prepare company profiles plus the retained official-employer candidates.
3. Run `python scripts/research-comp-expansion.py` to check public company/careers pages. Checks resume from their saved output.
4. Run `python scripts/research-comp-roles.py` to read the retained, discovered employer-board inputs. It also resumes from saved responses.
5. Run `node scripts/import-comp-expansion.cjs` to merge candidates, prioritize the requested stacks and levels, and regenerate the catalog and summary. It refuses to publish below 1,000 companies.
6. Run `node scripts/check-comp-catalog.cjs` and `npm run typecheck`.

The importer uses the existing check dates in this research snapshot. Refresh those dates when performing a new research pass, and clear the corresponding cached check outputs to actually recheck sources.

## Runtime checks

The original browser check covered all four primary technology filters, all three role filters, mid-level filtering, and the former pagination controls. The directory now displays every matching company at once. Search and filtering continue to run across the whole catalog.

The concurrent MongoDB storage work is preserved. The catalog API falls back to the checked-in company data for browsing if MongoDB is unavailable; account writes remain disabled in that mode. Database-backed preference persistence requires the separate MongoDB configuration and authenticated account.
