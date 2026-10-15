# Mind Bridge Testing & Quality Engineering Guide

This document provides technical documentation on the testing pyramid, unit & integration test suites, error boundaries, mocking strategies for Firebase and Gemini, and troubleshooting procedures for **Mind Bridge**.

---

## 1. The Mind Bridge Test Pyramid

```
           / \
          /   \
         / E2E \       <-- Visual UI Flows & Role Simulation (RoleDemoSwitcher)
        /-------\
       /  Integ  \     <-- Supertest API Routes & Zod Validation (src/server/routes/api.test.ts)
      /-----------\
     / Service/Eng \   <-- Scoring, RiskEngine, AlertEngine, Permissions, Triage
    /---------------\
   /   Unit Tests    \ <-- ErrorBoundary, Pure Math, Schema Validation, Formatters
  /-------------------\
```

1. **Unit Tests (Fast, In-Memory)**: Focus on mathematical determinism, boundary clamping, and pure functions (`scoring.test.ts`, `validation.test.ts`, `ErrorBoundary.test.tsx`).
2. **Service & Domain Engine Tests**: Verify multi-factor risk estimation, permission filtering, quiet hours calculations, and triage workflows (`riskEngine.test.ts`, `alertEngine.test.ts`, `permissions.test.ts`, `triageService.test.ts`).
3. **Integration & API Tests**: Use `supertest` against the Express application (`createApp()`) to verify token authentication, Zod request body validation, and Gemini failure fallbacks (`src/server/routes/api.test.ts`).

---

## 2. Error Boundary Architecture & Matrix

Mind Bridge uses `src/components/ErrorBoundary.tsx` to prevent React rendering crashes from cascading into white-screen failures. It also listens to global `window.onerror` and `window.onunhandledrejection` events.

### Error Handling Matrix

| Scenario / Error Type | Caught by ErrorBoundary? | Fallback Behavior | Recovery Action |
| :--- | :---: | :--- | :--- |
| **Component Render Crash** (e.g. `undefined.property` in JSX) | **YES** | Renders futuristic dark/neon alert card | "Reload Application" button or custom `onReset` |
| **Component Constructor / Lifecycle Crash** | **YES** | Intercepted by `getDerivedStateFromError` | Reloads component tree safely |
| **Global Script Runtime Error** (`window.onerror`) | **YES** | Handled via `handleWindowError` event listener | Displays sanitized error message |
| **Unhandled Async Promise Rejection** (`unhandledrejection`) | **YES** | Handled via `handleUnhandledRejection` event listener | Catches rejected promises and shows fallback |
| **Firestore Permission Error** (`permission-denied`) | **YES** | Formats error to: *"You don't have permission to access this data."* | Graceful user notice |
| **Offline / Network Disconnect** | **YES** | Formats error to: *"You appear to be offline. Please check your internet connection."* | Reconnection prompt |
| **Gemini / Firestore Quota Exceeded** | **YES** | Formats error to: *"The application has reached its usage limit."* | Displays usage limit advisory |
| **Click/Input Event Handler Error** (`onClick`) | Partially | Caught if unhandled; recommended to wrap in local `try/catch` | Local component state recovery |
| **Server-Side Crash** (`server.ts`) | **NO** (Backend) | Handled by Express `centralErrorHandler` returning `{ error: { code, message } }` | Client receives HTTP 500 JSON error |

---

## 3. How to Write a Test

### Writing a Service / Logic Test
Create a `*.test.ts` file in the same directory as the module:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateAssessmentResult } from './scoring';

describe('calculateAssessmentResult', () => {
  it('assigns high risk tier when weighted score exceeds 3.8', () => {
    const severeScores = { mood: 5, stress: 5, sleep: 4, behavior: 4, social: 3 };
    const result = calculateAssessmentResult(severeScores);

    expect(result.riskLevel).toBe('high');
    expect(result.weightedScore).toBeGreaterThanOrEqual(3.8);
  });
});
```

### Writing a React Component Test
Use `@testing-library/react` and Vitest:

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingState } from './AccessibleStates';

describe('LoadingState', () => {
  it('renders accessible loading text and status role', () => {
    render(<LoadingState message="Loading student data..." />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading student data...')).toBeInTheDocument();
  });
});
```

---

## 4. How to Mock Firebase & Gemini

### Mocking Firebase Services in Tests
When testing components or services that interact with Firestore or Auth, mock `@/lib/firebase` or `firebase/firestore`:

```typescript
import { vi } from 'vitest';

vi.mock('../lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id',
      email: 'student@mindbridge.edu',
      getIdToken: vi.fn().mockResolvedValue('mock-firebase-id-token')
    }
  },
  db: {},
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ name: 'Aarav Sharma', role: 'student' })
  }),
  getDocs: vi.fn().mockResolvedValue({
    docs: []
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  handleFirestoreError: vi.fn()
}));
```

### Mocking Gemini in Backend Tests
When testing routes or orchestration without making real API calls:

```typescript
import { vi } from 'vitest';
import { ServerGeminiService } from '../services/geminiService';

// Spy on service method to simulate failure or custom response
vi.spyOn(ServerGeminiService, 'generateInsight').mockResolvedValueOnce({
  status: 'Student is demonstrating consistent baseline patterns.',
  concerns: [],
  recommendations: ['Maintain regular schedule.']
});
```

---

## 5. Executing Test Suites

| Command | Purpose |
| :--- | :--- |
| `npm test` | Run Vitest in interactive watch mode during development |
| `npx vitest run` | Run all test suites once and report results |
| `npm run test:coverage` | Run all test suites and output V8 code coverage report |
| `npm run lint` | Run static TypeScript compiler checks (`tsc --noEmit`) |
| `npm run build` | Validate frontend production bundle and backend compilation |

---

## 6. Complete Test Suite Registry

The Mind Bridge test suite includes **13 distinct test files** covering backend routes, security rules, risk algorithms, and React UI error boundaries:

1. `src/server/routes/api.test.ts` (API routes, authentication, Zod validation, Gemini fallbacks)
2. `src/components/ErrorBoundary.test.tsx` (Error boundary, custom fallbacks, window.onerror, unhandledrejection)
3. `src/lib/permissions.test.ts` (PermissionEngine, role and relationship validation)
4. `src/services/analytics/permissionFilter.test.ts` (Role-aware data filtering, journal privacy protection)
5. `src/services/analytics/riskEngine.test.ts` (Emotional risk, burnout risk, disengagement formulas)
6. `src/services/analytics/alertEngine.test.ts` (Real-time alert triggers and spike detection)
7. `src/lib/ruleEngine.test.ts` (Deterministic insight rules, sleep-stress correlation)
8. `src/services/analytics/adaptiveEngine.test.ts` (Progressive assessment questions and follow-ups)
9. `src/services/crisis/crisisEscalationService.test.ts` (Indian helplines, Tele-MANAS, keyword detection, privacy redaction)
10. `src/services/privacy/privacyConsentService.test.ts` (Consent preferences, GDPR export, audit trail)
11. `src/services/counselor/triageService.test.ts` (Counselor workflow, notes, follow-up scheduling, queue KPIs)
12. `src/services/notifications/notificationPreferencesService.test.ts` (Delivery channels, quiet hours calculation, critical bypass)
13. `src/services/reports/weeklyReportService.test.ts` (Longitudinal 7-day report compilation, print view)
14. `src/services/demo/seedDataService.test.ts` (Role simulation seeds for all 5 personas)
15. `src/services/analytics/processingEngine.test.ts` (Trend calculation and academic overload heuristics)
16. `src/services/ai/validation.test.ts` (Emotion and risk schema validation)
17. `src/lib/scoring.test.ts` (Weighted scoring matrix and sentiment text modifier)
18. `src/lib/patternService.test.ts` (Statistical standard deviation anomaly detection)

---

## 7. Troubleshooting Common Test Failures

### 1. `Cannot find module '@testing-library/jest-dom/vitest'`
**Fix**: Ensure `src/test/setup.ts` imports from `@testing-library/jest-dom/vitest` or `@testing-library/jest-dom`. Check that `vitest.config.ts` includes `setupFiles: ['./src/test/setup.ts']`.

### 2. `Supertest connection refused (ECONNREFUSED)`
**Fix**: In `src/server/routes/api.test.ts`, do NOT use `http://localhost:3000`. Pass the `app` instance directly to `request(app)` from `createApp()`. This executes tests in-memory without binding ports.

### 3. `FirebaseError: Firebase: Need to provide options, when not being deployed to hosting`
**Fix**: Provide mock configuration or verify that `firebase-applet-config.json` exists in the project root.
