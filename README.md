# Mind Bridge

Mind Bridge is a student wellbeing and mental-health monitoring platform featuring a Student App, Caretaker Portal, and Admin Dashboard. It offers an intelligent wellbeing management ecosystem for identifying concerns early, supporting students effectively, and celebrating positive growth.

## Key Features

- **Student App**: Gamified, engaging interface for self-reporting, wellness tracking, and guided focus sessions.
- **Caretaker Portal**: AI-powered dashboard for parents, teachers, and counselors to monitor student well-being, send AI-generated encouragement, request wellness checks, and track trends without accessing private journals.
- **Admin Dashboard**: System administration interface to manage user roles and monitor overall platform health.
- **Progressive Assessment Engine**: Evaluates mood, stress, sleep, and social factors with dynamic follow-up questions.
- **Predictive Risk & Root-Cause Analysis**: Identifies statistical anomalies and generates actionable recommendations to preempt behavioral and mental-health issues.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Express, Node.js
- **Database**: Firebase (Firestore)
- **AI/ML**: Gemini API (Server-side Integration)

## Setup and Run

1. Clone the repository
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables by copying `.env.example` to `.env.local` and adding your `GEMINI_API_KEY`.
4. Run the development server:
   ```sh
   npm run dev
   ```

For detailed system design, refer to [ARCHITECTURE.md](./ARCHITECTURE.md).
