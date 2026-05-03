# Therapy module — complete reference (clinical progress + UI)

This document summarizes how therapy progress is computed, exposed, and shown across the stack after unification on **`server/src/services/progressEngine.js`** and the clinical explainability layer.

## Single source of truth: progress engine

**File:** `server/src/services/progressEngine.js`  
**Version:** `engineVersion: 3`

The engine ingests therapy plan goals, completed (and signed) session logs with `goalData`, and home assignments. It returns:

- **Per goal:** `current`, `trend` (`improving` | `stagnant` | `declining`), mastery, `confidenceScore` / `confidenceLabel`, `limitedDataUi` (goal-level low confidence), **`explanation`** (`dataSource`, `sessionsUsed`, `structuredDataRatio`, `smoothingApplied`, `inferredMeasurement`), **`reasoningSummary`**, **`timeSeries`** (`date`, `score`, optional `smoothedScore`, `confidence`), **`goalInsights`** (structured stagnant / declining / variability messages merged into `smartAlerts`).
- **Domains:** `domains[]` with `score`, `status`/`trend`, `confidenceScore`; also **`domainScores`** (`name`, `score`, `confidence`) for charts.
- **Overall:** `overallScore` (reliability-adjusted 0–5), `rawBlendScore`, adaptive **`_meta.blendingWeights`**, **`overallTrend`**, **`overallConfidence`**, **`overallExplanation`** (`sessionWeight`, `homeWeight`, `confidenceScore`, `dataQuality`).
- **Safety / alerts:** `smartAlerts` includes low overall confidence, inferred-heavy progress per goal, plus existing compliance/regression checks; per-goal insight alerts are appended with severity.

**Parent-facing subset:** `server/src/controllers/progressEngineController.js` → `parentSummary()` maps the full engine into a reduced payload (headline, optional `progressPercent`, `interpretWithCaution`, `domainScores`, `goalsBrief`, `alertsParent`) while avoiding misleading precision when confidence is low.

## APIs and persistence

| Surface | Role |
|--------|------|
| `GET /api/progress-engine/:caseId` | Full engine for clinicians/therapists; parent role gets summary only. |
| Case analytics (`caseAnalyticsSnapshot` + `analyticsController`) | Embeds `progressEngine` on unified analytics. |
| `POST /api/reports/generate/:caseId` (integrated) | Persists `buildIntegratedTherapyReport()` output including **`progressEngine`** on the report document. |
| Session create | `server/src/utils/postSessionProgressFeedback.js` builds **`progressFeedback`** (summary, improving/stagnant goal lists, alerts) for immediate UI. |

## Frontend — shared clinical UI

**Folder:** `client/src/components/progress-clinical/`

| Component | Purpose |
|-----------|---------|
| `constants.ts` | Confidence colors / tiers; trend glyphs (↑ → ↓). |
| `LimitedDataGuard.tsx` / `LowConfidenceBanner.tsx` | “Limited data” masking + caution copy. |
| `GoalProgressLineChart.tsx` | Recharts line: raw score + optional smoothed; tooltip with confidence + snippet. |
| `DomainPerformanceBarChart.tsx` | Horizontal 0–5 bars; fill from confidence tier. |
| `GoalClinicalCard.tsx` | Title, 0–5 bar, trend icon, confidence badge, optional **Why?** |
| `GoalWhyModal.tsx` | Reasoning + data provenance. |
| `ClinicalAlertsPanel.tsx` | Alerts grouped by critical / warning / info. |
| `SessionProgressModal.tsx` | Post-session “Progress update” dialog. |

**Wired into:**

- `CaseProgressAnalyticsDashboard.tsx` — same domain chart, composite line, alerts, goal cards + Why modal; overall limited when `confidence.overall < 0.4`.
- `ProgressMonitoringTab.tsx` — 0–5 overall, domain horizontal chart, composite `TrendLineChart`, alerts, per-domain goal cards + per-goal line charts; session insights de-emphasize raw `childResponse` strings in favor of engine-linked goal names.
- `ReportDocumentView.tsx` — **integrated** reports with `data.progressEngine` use **`IntegratedReportEngineView`**: engine-only goal trajectories, domain chart, alerts, recommendations derived from engine weak areas + alerts; legacy path remains if an old report lacks `progressEngine`.
- `ParentCaseIntegrationPanels.tsx` — domain chart, goal cards, grouped alerts when summary payload includes new fields.
- `SessionForm.tsx` — after successful **create**, opens **`SessionProgressModal`** when feedback is present.

## Types

`client/src/components/analytics/types.ts` — `ProgressEnginePayload` and goal rows extended for explainability, `domainScores`, `overallExplanation`, etc.

## Clinical design principles (implemented)

1. **One scale in UI:** primary display **0–5** for goals and domains in therapist/clinician surfaces; parent momentum may still show a **derived percent** when confidence allows, with “Limited data” when not.
2. **Uncertainty visible:** low confidence triggers banners and masked overall score where specified.
3. **No conflicting primacy:** integrated clinical report narrative is driven from **`progressEngine`** when embedded; raw legacy percentiles are not the headline for that path.

## Tests

- `server/tests/integration/progress-analytics.integration.test.js` — exercises progress overview + embedded `progressEngine` (passes with engine v3).

## Files touched (high level)

- Backend: `progressEngine.js`, `progressEngineController.js`, `reportGenerator.js`, `postSessionProgressFeedback.js`.
- Frontend: `progress-clinical/*`, `CaseProgressAnalyticsDashboard.tsx`, `ProgressMonitoringTab.tsx`, `ReportDocumentView.tsx`, `ParentCaseIntegrationPanels.tsx`, `SessionForm.tsx`, `analytics/types.ts`.

---

*Generated as part of the clinical explainability + visualization rollout.*
