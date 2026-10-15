# Changelog

All notable changes to the **Mind Bridge** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-10-15

### Added
- **Modular Backend Architecture**:
  - Split `server.ts` into `src/server/app.ts`, `src/server/routes/api.ts`, `src/server/middleware/auth.ts`, `src/server/middleware/security.ts`, `src/server/middleware/validate.ts`, `src/server/middleware/errorHandler.ts`, and `src/server/services/geminiService.ts`.
  - Added `GET /api/health` health check endpoint for container uptime and monitoring.
  - Implemented Firebase ID token verification middleware across all protected `/api` endpoints.
  - Integrated Helmet security headers, Express rate limiting (120 req / 15 min), restricted CORS allowlist, and 2MB body size limit.
  - Enforced Zod request body validation on all POST routes, returning standardized `{ error: { code, message } }` responses.
  - Built resilient Gemini failure fallbacks ensuring the user interface never crashes on API quota exhaustion or network dropouts.
- **Hardened Firestore Security Rules & Blueprint**:
  - Removed blanket authenticated access on `users`, `students`, and `notifications`.
  - Enforced strict relationship-based access control (`isOwner`, `isParentOf`, `isTeacherOrClinicianOrCaretaker`, `isAdmin`).
  - Harmonized entity naming between `firebase-blueprint.json`, `firestore.rules`, and frontend types (`students` collection, `active`/`resolved`/`dismissed` alert statuses).
  - Added schema matches for `triageCases`, `auditLogs`, and `userPreferences`.
- **Crisis Escalation Screen**:
  - Integrated official 24/7 Indian national mental health helplines: **Tele-MANAS (14416 / 1800-891-4416)**, Vandrevala Foundation, KIRAN (1800-599-0019), Childline (1098), and 112.
  - Enforced strict privacy rule: parents and counselors receive clinical summaries only, never verbatim student reflections.
- **Student Privacy & Consent Center**:
  - Added granular consent toggles (school sharing, parent summary vs full visibility, AI analysis opt-in, telemetry anonymization).
  - Built GDPR/FERPA-compliant machine-readable data export (JSON download).
  - Implemented Right-to-be-Forgotten data deletion workflow.
  - Created immutable access audit log tracking who viewed or altered student records.
- **Counselor Triage Queue**:
  - Clinical workflow with status progression (`new` -> `in_progress` -> `resolved`), priority ratings (low to critical), counselor session notes, and follow-up appointment scheduling.
- **Notification Preferences & Quiet Hours**:
  - Multi-channel delivery toggles (In-App, Email, SMS).
  - Configurable Quiet Hours window (e.g. 22:00 to 07:00) with emergency critical safety bypass.
- **Weekly Wellbeing Print/PDF Report**:
  - Added print/PDF generation view with clean print styling (`@media print`), aggregating 7-day longitudinal trajectory, wellbeing indices, and academic correlations.
- **Accessibility & Offline Resilience**:
  - Added persistent `OfflineBanner` displaying cached mode and reconnect status.
  - ARIA attributes, keyboard navigation support, and `skip-to-content` anchor.
  - Standardized accessible loading, empty, and error states.
- **5-Role Simulation Mode**:
  - Quick-switch persona switcher in header supporting all 5 core roles: `student`, `parent`, `teacher`, `counselor`, and `school_admin`.
- **Comprehensive Vitest Test Suite**:
  - Added tests for `permissions.ts`, `permissionFilter.ts`, `riskEngine.ts`, `alertEngine.ts`, `ruleEngine.ts`, `adaptiveEngine.ts`.
  - Added service tests for crisis escalation, privacy consent, triage queue, notifications, weekly report, and demo seeds.
  - Added Supertest API suite for all Express routes (`api.test.ts`).
  - Extended `ErrorBoundary.test.tsx` with custom fallbacks, window error events, and unhandled promise rejections.
  - Added GitHub Actions CI workflow (`.github/workflows/ci.yml`).
- **Technical Documentation**:
  - Completely updated `README.md` with Mermaid architecture diagrams, RBAC matrix, API reference, Firestore schemas, and AI pipeline.
  - Expanded `TESTING.md` with test pyramid, mock instructions, and error boundary matrix.

### Changed
- Reorganized repository structure: moved Jupyter notebook files into `/notebooks/` and removed one-off color replacement scripts.
