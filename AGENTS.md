# Mind Bridge Architectural Guidelines

## Core Philosophy
“Emotionally supportive monitoring without making students feel clinically observed.”

This is NOT a hospital system, ERP, or just a mood tracker. Mind Bridge combines AI-powered wellness analysis, academic stress intelligence, gamified student engagement, realtime monitoring, relationship-aware permissions, and institutional classroom infrastructure.

## Permissions & Roles
- **Roles:** student, parent, teacher, school_admin, counselor
- **Relationship Architecture:** `parent_of`, `teacher_of`, `school_monitor_of`
- **Permission Principles:** Centralized in `src/lib/permissions.ts`.
  - Parents view summaries/alerts, not raw journals.
  - Teachers monitor assigned classrooms, not deeply personal reflections.

## AI Engineering Rules
- **Centralized:** All AI calls must go through `src/services/ai/aiOrchestrator.ts`.
- **Validation:** All outputs must be validated (no hallucinated JSON).
- **Safety:** Always maintain emotionally safe responses (never clinical/cold).
- **No Direct Calls:** DO NOT put direct Gemini API calls inside UI components.

## React Rules
- **No Business Logic in UI:** Keep components clean.
- **State Management:** Use Zustand (`src/store/useAppStore.ts`).
- **No Direct Firestore Queries in UI:** Abstract to service modules.

## UI/UX Aesthetic
- Black futuristic aesthetic
- Green and blue neon accents
- Emotionally calming interfaces, smooth animations
- Netflix-style profile selector
