# Job backlog consolidation — October 24, 2026

The Jobs catalog now includes every existing catalog source, company-specific CV target, and identifiable job description found in the connected MongoDB CV collection. Source records are merged by posting URL; a matching company and title can fill missing links. Different requisition URLs remain separate jobs.

| Source | Targets inspected |
| --- | ---: |
| Master Jobs worksheet data | 213 |
| Additional direct-company leads | 188 |
| Source-dated October postings | 10 |
| LinkedIn research | 90 |
| Company-specific CV variants | 14 |
| MongoDB `cv_generations` | 6 records, describing 3 distinct targets |

The 518 normalized source targets consolidate into **496 job records**, retaining **521 source identities**. The CV targets contribute 10 additional records and enrich 4 existing records. Mongo contributes 2 additional targets (Tebra Staff Software Engineer, AI Engineering; RevenueCat Senior Backend Engineer) and enriches the existing Praxent target. The previously suppressed First Factory research target is also retained because it has a separate posting URL.

The connected Mongo deployment exposed no `cv_jobs` collection. Other matching collection names contained scheduler runs, locks or business leads rather than career opportunities. Mongo was read only. The generated snapshot includes job metadata; it excludes owner identifiers, personal CV content, profiles and provider output. Failed CV generations still contain usable job descriptions and are not treated as rejected applications.

The existing `ALLJOBS.xlsx` workbook contained 213 populated Master Jobs rows and 401 All Search Records rows. The Costa Rica software-jobs workbook contained 45 job rows. Their targets were already represented by posting URL or company and role, so they did not add distinct jobs. Resume employment history was excluded from job leads.

## Backlog and HOT

Source defaults yield **435 unreviewed jobs**: 8 displayed in HOT and **427 in Backlog**. The other **61** retain their application history in Archive. Browser-local Seen flags, application states and explicit dismissals can change these counts.

HOT's fit, October publication date, company and URL rules now affect eligibility only. Unreviewed jobs with missing dates, missing links, lower scores or other HOT exclusions remain browsable in Backlog. All new targets use the existing deterministic fit scorer; CV tailoring and generation timestamps never become publication dates.

Merged records retain original IDs and application keys as aliases. Hydration restores Seen flags and application history from those aliases and maps saved HOT preferences, rotations and dismissals to the surviving IDs.

## Refresh and validation

Refresh saved Mongo targets and their fit ratings with:

```powershell
node scripts/import-mongo-job-backlog.cjs
python scripts/rate_jobs.py --top 0
```

`python scripts/get_jobs.py --json` now exports the consolidated catalog used by the board.

Passed: TypeScript, ESLint for `app/jobs`, import/deduplication/history-migration checks, audit checks with 5,000 synthetic jobs, HOT rotation/persistence checks, paginated UI checks and 57 deterministic availability cases. Browser visuals and production deployment were not exercised.
