# Mind Bridge

> **Emotionally supportive wellbeing monitoring without making students feel clinically observed.**

Mind Bridge is a student wellbeing and mental health intelligence ecosystem designed for educational environments. It brings together student self-reflection tools, academic stress forecasting, gamified resilience building, and relationship-aware caretaker monitoring for parents, teachers, school administrators, and counselors.

---

## 1. Core Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, FullCalendar, Recharts, Lucide Icons, Motion
- **State Management**: Zustand (`src/store/useAppStore.ts`)
- **Backend**: Node.js & Express (`server.ts`) with Vite SSR/SPA middleware
- **Database & Auth**: Google Firebase (Firestore & Firebase Authentication with Google Sign-In)
- **AI/ML Engine**: Google Gemini API via `@google/genai` (centralized server-side proxy routes to secure API keys)
- **Testing**: Vitest, React Testing Library, JSDOM

---

## 2. User Roles & Permission Model

Enforced through `src/lib/permissions.ts` and `firestore.rules`:

| Role | Description | Access Scope |
| :--- | :--- | :--- |
| `student` | The core learner | Logs mood, reflections, focus sessions, schedule items, and redemptions. Cannot view other students' records. |
| `parent` | Caretaker of specific child | Monitors assigned children, receives alerts, requests check-ins, views recommendations without accessing raw private journals. |
| `teacher` | Classroom instructor | Monitors assigned student cohorts, workload stress, and calendar deadlines. |
| `counselor` / `clinician` | School wellness professional | Accesses clinical risk insights, student triage queues, and direct interventions. |
| `school_admin` / `admin` | Institutional administration | Manages role assignments, monitors school-wide aggregate safety signals, and maintains system integrity. |

---

## 3. Backend API Endpoints (`server.ts`)

All Gemini AI interactions run securely through server-side Express routes on port 3000 to protect credentials.

### API Route Reference

#### 1. `POST /api/gemini/insight`
Generates a structured clinical summary and actionable guidance for caretakers based on student telemetry.
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response Shape**:
  ```json
  {
    "status": "string",
    "concerns": ["string"],
    "recommendations": ["string"]
  }
  ```

#### 2. `POST /api/gemini/pattern`
Analyzes longitudinal assessment history to identify cyclical patterns, temporal trends, and statistical anomalies.
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response Shape**:
  ```json
  {
    "patterns": [
      {
        "type": "cyclical | trend | behavioral",
        "title": "string",
        "description": "string",
        "frequency": "string",
        "impact": "positive | negative | neutral",
        "confidence": 0.85
      }
    ],
    "anomalies": [
      {
        "timestamp": "ISO-8601 string",
        "metric": "string",
        "deviation": 2.4,
        "description": "string",
        "severity": "low | medium | high"
      }
    ]
  }
  ```

#### 3. `POST /api/gemini/predict`
Forecasts student risk for the upcoming 7-day window based on academic deadlines, sleep debt, and mood trends.
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response Shape**:
  ```json
  {
    "predictedRisk": "low | medium | high",
    "confidence": 85,
    "predictedTriggers": ["string"],
    "preemptiveActions": ["string"],
    "evidence": ["string"]
  }
  ```

#### 4. `POST /api/gemini/recommend`
Generates structured multi-step action plans for students, parents, and educators.
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response Shape**:
  ```json
  {
    "recommendations": [
      {
        "type": "activity | resource | strategy",
        "title": "string",
        "description": "string",
        "priority": "low | medium | high",
        "context": "string",
        "actionLabel": "string",
        "steps": ["string", "string", "string"]
      }
    ]
  }
  ```

#### 5. `POST /api/gemini/root-cause`
Performs multi-factor correlation between academic events, sleep disruption, and emotional shifts.
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response Shape**:
  ```json
  {
    "primaryFactor": "string",
    "explanation": "string",
    "confidence": 0.85
  }
  ```

#### 6. `POST /api/gemini/supportive-summary`
Drafts empathetic, uplifting summaries tailored for parent-student check-in conversations.
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response Shape**:
  ```json
  {
    "text": "string"
  }
  ```

#### 7. `POST /api/gemini/progressive-questions`
Dynamically constructs stage-adapted multiple-choice questions for daily or weekly student check-ins.
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response Shape**:
  ```json
  [
    {
      "category": "string",
      "text": "string",
      "options": [
        { "label": "string", "value": 5 },
        { "label": "string", "value": 4 },
        { "label": "string", "value": 3 },
        { "label": "string", "value": 2 },
        { "label": "string", "value": 1 }
      ]
    }
  ]
  ```

#### 8. `POST /api/gemini/analyze-progressive-assessment`
Evaluates student progressive assessment answers and assigns a developmental wellness profile.
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response Shape**:
  ```json
  {
    "insight": {
      "message": "string",
      "recommendations": ["string"]
    },
    "wellnessProfile": "Thriving Learner | Exam-Stressed Student | Sleep-Deprived Student | Socially Withdrawn Student | Burnout Risk Student | Analyzing Baseline"
  }
  ```

#### 9. `POST /api/gemini/parse-syllabus`
Extracts examination dates, assignment milestones, and syllabus events, with burnout prevention recovery buffers.
- **Request Body**:
  ```json
  {
    "prompt": "string",
    "parts": [{ "text": "string" }]
  }
  ```
- **Response Shape**:
  ```json
  {
    "events": [
      {
        "title": "string",
        "start": "YYYY-MM-DD",
        "end": "YYYY-MM-DD",
        "allDay": true,
        "type": "exam | break | recovery | study | assignment"
      }
    ],
    "insights": ["string"]
  }
  ```

#### 10. `POST /api/gemini/analyze-emotion`
Extracts sentiment polarity, emotional valence, and safety escalation flags from student freeform reflections.
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response Shape**:
  ```json
  {
    "mood": 3,
    "stressLevel": "Low | Moderate | High",
    "concerns": ["string"],
    "supportiveMessage": "string",
    "requiresEscalation": false
  }
  ```

#### 11. `POST /api/gemini/analyze-assessment`
Evaluates category-level scores to provide a concise primary factor and two actionable teacher/parent suggestions.
- **Request Body**:
  ```json
  {
    "prompt": "string"
  }
  ```
- **Response Shape**:
  ```json
  {
    "primaryFactor": "string",
    "recommendations": ["string", "string"]
  }
  ```

---

## 4. Firestore Database Schema & Security Rules

Enforced continuously by `firestore.rules`:

### Collections Reference

#### Collection: `users/{userId}`
- **Description**: Registered user account credentials and platform roles.
- **Fields**:
  - `uid` (`string`, required): Matches Firebase Auth `request.auth.uid`.
  - `name` (`string`, required, 1-100 chars): Display name.
  - `email` (`string`, required): RFC 5322 formatted email address.
  - `role` (`string`, required): One of `'parent' | 'teacher' | 'clinician' | 'student' | 'caretaker' | 'school_admin'`.
  - `organization` (`string`, optional): Associated school district or institution.
- **Permissions**:
  - **Read**: Any authenticated user (`request.auth != null`).
  - **Create / Update**: Account owner (`request.auth.uid == userId`) or `admin`.
  - **Delete**: Restricted.

#### Collection: `students/{childId}`
- **Description**: Student profile records monitored within the system.
- **Fields**:
  - `parentId` (`string`, required): UID of the associated parent account.
  - `name` (`string`, required, 1-100 chars): Student name.
  - `age` (`number`, required, 1-20): Student age.
  - `grade` (`string`, optional): Grade level.
  - `avatar` (`string`, optional): Avatar image URL.
  - `notes` (`string`, optional, <2000 chars): Caretaker background notes.
  - `riskLevel` (`string`, optional): `'low' | 'medium' | 'high'`.
  - `lastMoodScore` (`number`, optional): Most recent calculated mood metric.
  - `lastStressLevel` (`string`, optional): Most recent stress categorization.
  - `connectedPlatforms` (`list`, optional): Array of integrated platforms.
- **Permissions**:
  - **Read**: Associated parent (`parentId == auth.uid`) OR authorized staff (`teacher`, `clinician`, `caretaker`, `school_admin`, `admin`).
  - **Create / Update**: Authenticated users.
  - **Delete**: Restricted to `parent` or `school_admin`.

#### Subcollection: `students/{childId}/schedules/{scheduleId}`
- **Description**: Class timetable entries specific to a student.
- **Fields**: `subject` (`string`), `day` (`string`), `startTime` (`string`), `endTime` (`string`), `room` (`string`).
- **Permissions**:
  - **Read**: Associated parent or authorized staff.
  - **Write / Delete**: Associated parent only.

#### Collection: `assessments/{assessmentId}`
- **Description**: Multi-category wellness evaluations submitted by students or caretakers.
- **Fields**:
  - `childId` (`string`, required): Target student identifier.
  - `parentId` (`string`, required): Parent account identifier.
  - `submittedBy` (`string`, required): UID matching `request.auth.uid`.
  - `timestamp` (`string`, required): ISO-8601 submission timestamp.
  - `scores` (`map`, required): Breakdown map containing `mood`, `stress`, `sleep`, `behavior`, `social` (1-5 scale).
  - `totalScore` (`number`, required): Aggregate score.
  - `aiInsight` (`string`, optional, <15000 chars): Generated assessment insight.
- **Permissions**:
  - **Read / Create / Update / Delete**: Associated parent, the student themselves (`childId == auth.uid`), or authorized staff.

#### Collection: `notifications/{alertId}`
- **Description**: Real-time alerts generated from high-risk indicators or status updates.
- **Fields**:
  - `childId` (`string`, required): Target student identifier or `'all'`.
  - `parentId` (`string`, required): Parent identifier.
  - `type` (`string`, required): `'critical' | 'warning' | 'info'`.
  - `title` (`string`, required, <200 chars): Alert headline.
  - `description` (`string`, optional): Detailed description.
  - `timestamp` (`string`, required): ISO-8601 timestamp.
  - `status` (`string`, optional): `'active' | 'resolved'`.
- **Permissions**:
  - **Read**: Associated parent, student recipient, or staff.
  - **Write**: Any authenticated user.

#### Collection: `schoolSchedules/{scheduleId}`
- **Description**: Academic milestones, exams, deadlines, and extracurricular activities.
- **Fields**:
  - `childId` (`string`, required): Target student.
  - `parentId` (`string`, optional): Associated parent.
  - `type` (`string`, required): `'class' | 'exam' | 'activity' | 'deadline' | 'assignment' | 'event'`.
  - `title` (`string`, required, <200 chars): Event title.
  - `day` (`string`, required): Monday through Sunday.
  - `time` (`string`, required): Event time string.
  - `subject` (`string`, optional): Course or subject.
  - `difficulty` (`string`, optional): `'low' | 'medium' | 'high'`.
- **Permissions**:
  - **Read / Write**: Associated parent or authorized staff.

#### Collection: `selfChecks/{checkId}`
- **Description**: Quick, lightweight emotional check-ins submitted directly by students.
- **Fields**:
  - `childId` (`string`, required): Student identifier.
  - `timestamp` (`string`, required): Submission timestamp.
  - `mood` (`number`, required): Self-reported mood rating.
  - `tags` (`list`, optional): Emotion and situational tags.
  - `note` (`string`, optional, <1000 chars): Personal notes.
  - `interventionUsed` (`string`, optional): Coping mechanism used (e.g. breathing).
- **Permissions**:
  - **Read / Write**: Associated parent or authorized staff.

#### Collection: `rootCauseAnalyses/{analysisId}`
- **Description**: Longitudinal multi-factor synthesis linking stressors to emotional changes.
- **Fields**:
  - `childId` (`string`, required): Student identifier.
  - `parentId` (`string`, required): Parent identifier.
  - `timestamp` (`string`, required): ISO-8601 timestamp.
  - `primaryFactor` (`string`, required, <500 chars): Primary identified factor.
  - `contributingFactors` (`list`, optional): List of contributing factors.
  - `recommendedFocus` (`string`, optional): Suggested pedagogical focus.
- **Permissions**:
  - **Read / Write**: Associated parent or authorized staff.

#### Collection: `sessions/{sessionId}`
- **Description**: Guided focus, study, or breathing sessions completed by students.
- **Fields**:
  - `userId` (`string`, required): UID matching `request.auth.uid`.
  - `childId` (`string`, optional): Target student identifier.
  - `type` (`string`, required): Session mode (e.g., `'focus'`, `'breathing'`).
  - `durationMinutes` (`number`, required): Duration in minutes.
  - `timestamp` (`string`, required): Completion timestamp.
- **Permissions**:
  - **Read**: Session owner (`userId == auth.uid`) or authorized staff.
  - **Create / Update / Delete**: Session owner.

#### Collection: `schedules/{scheduleId}`
- **Description**: Global calendar appointments and personal timetable entries.
- **Fields**: `userId` (`string`), `title` (`string`), `subject` (`string`), `start` (`string`), `end` (`string`).
- **Permissions**:
  - **Read / Write**: Entry owner (`userId == auth.uid`) or authorized staff.

#### Collections: `relationships/{relId}` & `connectionRequests/{reqId}`
- **Description**: Caretaker-to-student associations and verification requests.
- **Fields**: `caretakerId` (`string`), `studentId` (`string`), `relationshipType` (`string`), `status` (`string`).
- **Permissions**:
  - **Read / Write**: Either linked caretaker or student (`auth.uid in [caretakerId, studentId]`).

#### Specialized Intelligence Collections
- `emotional_stability`, `mental_resilience`, `silent_risk`, `trigger_map`, `intervention_effectiveness`:
  - Dedicated analytical caches for offline model aggregation. Authenticated read/write enabled.

---

## 5. Running the Application

### Prerequisites
- Node.js 20+
- npm

### Installation
```bash
npm install
```

### Environment Variables
Configure your environment in `.env.local`:
```env
# Required for server-side Gemini intelligence
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase configuration is pre-configured in src/lib/firebase.ts
```

### Development
```bash
npm run dev
```
The application runs on `http://localhost:3000`.

### Production Build
```bash
npm run build
npm start
```

---

## 6. Testing & Quality Assurance

Unit and integration tests are powered by **Vitest** and **React Testing Library**.

```bash
# Run all tests once
npm test -- --run

# Run tests in watch mode
npm test
```

For in-depth details regarding the Error Boundary architecture, test suites, and coverage scope, consult [TESTING.md](./TESTING.md).
