# Mind Bridge Testing & Error Resilience Guide

This document outlines the testing architecture, error handling boundaries, execution procedures, and current coverage status for the Mind Bridge application.

---

## 1. Error Boundary Architecture (`src/components/ErrorBoundary.tsx`)

Mind Bridge implements a centralized React Class Component `ErrorBoundary` to gracefully isolate runtime rendering errors and prevent white-screen crashes.

### How It Works
- **Lifecycle Interception**:
  - `static getDerivedStateFromError(error: Error)`: Intercepts unhandled synchronous exceptions during component rendering and updates component state (`hasError: true, error`), immediately triggering the fallback user interface on the next render pass.
  - `componentDidCatch(error: Error, errorInfo: React.ErrorInfo)`: Logs structured error details and component stack traces to console monitoring.
- **Error Sanitization & Classification**:
  - Automatically parses JSON-encoded Firestore operational errors (dispatched from `handleFirestoreError` in `src/lib/firebase.ts`).
  - Maps common distributed failure modes to friendly user-facing messages:
    - **Permissions (`permission-denied`, `Missing or insufficient permissions`)**: *"You don't have permission to access this data."*
    - **Offline / Network (`offline`, `network`)**: *"You appear to be offline. Please check your internet connection."*
    - **Resource / Quota (`quota`, `RESOURCE_EXHAUSTED`)**: *"The application has reached its usage limit. Please try again later."*
    - **Fallback**: *"An unexpected error occurred."*
- **Recovery Action**:
  - Offers a **"Reload Application"** button that invokes `window.location.reload()`, clearing broken in-memory component trees and restoring a clean state.

### What It Catches
- Render phase errors in child components.
- Lifecycle method errors (`componentDidMount`, `componentDidUpdate`, etc.).
- Errors in constructor functions of child components.
- Errors thrown when evaluating JSX expressions within children.

### What It Does NOT Catch (By React Specification)
- **Asynchronous Event Handlers**: Errors thrown inside `onClick`, `onChange`, or `setTimeout` callbacks (these must be handled via `try/catch` or global window listeners).
- **Asynchronous Network Calls**: Promises that reject asynchronously outside render passes (handled via `try/catch` in data/API services).
- **Server-Side Code**: Express endpoints in `server.ts`.
- **Errors Inside ErrorBoundary Itself**: Errors thrown within the `ErrorBoundary` component's own render method.

---

## 2. Running Unit & Integration Tests

The testing environment utilizes **Vitest** paired with **React Testing Library** and **JSDOM**.

### Commands

| Command | Description |
| :--- | :--- |
| `npm test` | Launches Vitest test runner (interactive/watch mode locally, single pass in CI) |
| `npm test -- --run` | Executes a single non-interactive test run across all test suites |
| `npx vitest run` | Direct Vitest single-run command |

### Configuration
- Configuration is centralized in `vitest.config.ts`.
- Path aliases (`@/` mapping to project root) mirror `vite.config.ts`.
- DOM matchers from `@testing-library/jest-dom/vitest` are initialized automatically via `src/test/setup.ts`.

---

## 3. Current Test Coverage vs. Future Scope

### Implemented Test Suites

1. **`src/components/ErrorBoundary.test.tsx`**
   - Normal rendering of children without errors.
   - Catching thrown component render errors and rendering fallback UI.
   - Parsing and formatting Firebase permission errors.
   - Parsing and formatting JSON-wrapped Firestore operation errors.
   - Handling offline/network disconnect errors.
   - Handling quota exceeded exceptions.

2. **`src/services/analytics/processingEngine.test.ts`**
   - `calculateTrends`: empty/null data protection, average mood calculation, positive/declining/stable classification.
   - `analyzeAcademicOverload`: assignment and overdue task density calculations, overload threshold detection (>0.7).

3. **`src/services/ai/validation.test.ts`**
   - `validateEmotions`: fallback defaults for missing fields, bounds clamping on mood ([1, 5]), stress levels.
   - `validateRisk`: risk tier mapping and fallback handling.

4. **`src/lib/scoring.test.ts`**
   - `calculateAssessmentResult`: multi-factor category weighting (mood, stress, sleep, behavior, social).
   - Risk classification thresholds (low, medium, high).
   - Sentiment & NLP text risk modifier scoring based on clinical urgency keywords.
   - Keyword detection for self-harm and elevated distress phrases.

5. **`src/lib/patternService.test.ts`**
   - `detectLocalAnomalies`: minimum historical sample enforcement (<5 entries returns empty).
   - Statistical standard deviation anomaly detection on longitudinal student metrics.

---

### Coverage Scope Breakdown

| Module / Layer | Current Test Status | Notes |
| :--- | :--- | :--- |
| `ErrorBoundary.tsx` | Covered | Verified with simulated component crash and error variations |
| Analytics & Processing Engine | Covered | Trend and overload mathematics verified |
| AI Schema Validation | Covered | Safe defaults, clamping, and error recovery verified |
| Scoring & Sentiment Matrices | Covered | Weighted mathematics and keyword extraction verified |
| Local Statistical Anomaly Engine | Covered | Standard deviation triggers tested |
| UI Views (`Dashboard`, `Reports`) | *Future Scope* | Mocking full Firestore subscriptions and FullCalendar DOM |
| Backend Express Routes (`server.ts`) | *Future Scope* | End-to-end integration tests using Supertest with Gemini mock |
| Relationship & RBAC Filters | *Future Scope* | Integration testing with Firebase Local Emulator Suite |
