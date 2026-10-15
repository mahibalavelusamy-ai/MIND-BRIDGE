# Contributing to Mind Bridge

Thank you for your interest in contributing to **Mind Bridge**, an AI-driven youth mental health intelligence and emotional resilience platform.

## Core Philosophy & Design Constitution

When developing or modifying features in Mind Bridge, you must adhere strictly to our core engineering values:

1. **Emotionally Supportive Monitoring**: The system is designed to provide proactive wellness analysis without making students feel clinically observed or pathologized. Never use alarmist or stigmatizing diagnostic labels in student-facing UI.
2. **Strict Relationship-Aware Privacy**:
   - Students have full data sovereignty over their private reflections and diary notes.
   - Parents receive supportive summaries and early-warning alerts, **never** raw journal text.
   - Teachers monitor aggregated classroom engagement and academic stress clustering, **never** deeply personal student reflections.
   - Counselors have an intake triage queue for escalating cases.
3. **Black & Neon Futuristic Aesthetic**: Maintain the black surface aesthetic with emerald green and cyan neon accents. Follow anti-AI slop design discipline.
4. **Resilience & Fallback Architecture**: All AI orchestrations via Gemini must implement deterministic, graceful fallbacks so that network degradation or quota limits (HTTP 429) never break user interfaces.

---

## Development Workflow

### Prerequisites
- Node.js >= 20.x or Bun >= 1.2
- npm or bun

### Local Setup
```bash
# Clone the repository
git clone https://github.com/mahibalavelusamy-ai/MIND-BRIDGE.git
cd MIND-BRIDGE

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Run local development server (Express backend + Vite HMR)
npm run dev
```

The application will be live at `http://localhost:3000`.

---

## Verification Commands

Before opening a pull request or submitting code, ensure that all verification checks pass with zero errors:

```bash
# 1. Static Type Checking & Linting
npm run lint

# 2. Execute Vitest Test Suites
npx vitest run

# 3. Test Coverage Report
npm run test:coverage

# 4. Production Build (Frontend Vite Bundle + Backend esbuild compilation)
npm run build
```

---

## Coding Standards

### Backend Architecture (`src/server/`)
- Express routes must reside in `src/server/routes/`.
- All `/api` routes (except `/api/health`) must enforce `authenticateToken` middleware.
- Request payloads must be strictly validated with **Zod** using `validateBody(schema)`.
- Errors must adhere to the standardized schema: `{ error: { code: string, message: string } }`.
- AI calls must be abstracted into `ServerGeminiService` with robust fallback defaults.

### Firestore Security Rules (`firestore.rules`)
- Never use blanket `allow read, write: if isSignedIn();`.
- Always validate identity, user role, and relational ownership (`parentId`, `studentId`, `isTeacherOrClinicianOrCaretaker()`).
- Keep `firebase-blueprint.json` and `firestore.rules` synchronized.
- Deploy rules using the Firebase tool when rule changes occur.

### Testing Conventions (`*.test.ts`, `*.test.tsx`)
- Write tests using **Vitest** and **React Testing Library**.
- Place unit tests adjacent to the module under test (e.g., `riskEngine.test.ts`).
- Ensure all business logic functions, permission gates, and API routes maintain automated test coverage.
