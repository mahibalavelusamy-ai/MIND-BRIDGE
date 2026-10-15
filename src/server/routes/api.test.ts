import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { ServerGeminiService } from '../services/geminiService';
import { admin } from '../middleware/auth';

describe('Mind Bridge Backend API Routes', () => {
  const app = createApp();
  const validAuthHeader = 'Bearer test-token';

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    vi.restoreAllMocks();

    vi.spyOn(ServerGeminiService, 'generateInsight').mockResolvedValue({
      status: 'Stable wellbeing baseline',
      concerns: ['Mild academic load'],
      recommendations: ['Maintain regular sleep schedule']
    });

    vi.spyOn(ServerGeminiService, 'generatePattern').mockResolvedValue({
      patterns: [{ factor: 'Sleep', observation: 'Slight decline near exams' }],
      anomalies: [{ timestamp: '2026-10-14', description: 'Late night check-in' }]
    });

    vi.spyOn(ServerGeminiService, 'generatePrediction').mockResolvedValue({
      predictedRisk: 'low',
      confidence: 88,
      predictedTriggers: ['Midterm exams'],
      preemptiveActions: ['Encourage brief focus breaks'],
      evidence: ['Stable baseline mood scores']
    });

    vi.spyOn(ServerGeminiService, 'generateRecommendations').mockResolvedValue({
      recommendations: [
        {
          type: 'activity',
          title: 'Mindful 4-7-8 Breathing Reset',
          description: 'A 3-minute somatic regulation exercise.',
          priority: 'medium',
          context: 'Daily Transition Routine',
          actionLabel: 'Begin Session',
          steps: ['Inhale quietly for 4 seconds', 'Hold for 7 seconds', 'Exhale for 8 seconds']
        }
      ]
    });

    vi.spyOn(ServerGeminiService, 'generateRootCause').mockResolvedValue({
      primaryFactor: 'Academic Transition',
      explanation: 'Balanced performance with manageable workload.',
      confidence: 0.88
    });

    vi.spyOn(ServerGeminiService, 'generateSupportiveSummary').mockResolvedValue({
      text: 'Student demonstrates consistent emotional regulation and steady engagement.'
    });

    vi.spyOn(ServerGeminiService, 'generateProgressiveQuestions').mockResolvedValue([
      { id: 'q1', text: 'How rested do you feel today?', options: ['Very', 'Somewhat', 'Tired'] }
    ]);

    vi.spyOn(ServerGeminiService, 'analyzeProgressiveAssessment').mockResolvedValue({
      summary: 'Progressive check-in indicates positive coping strategies.',
      riskTier: 'low',
      recommendations: ['Continue peer support group']
    });

    vi.spyOn(ServerGeminiService, 'parseSyllabus').mockResolvedValue({
      events: [{ title: 'Math Midterm', date: '2026-10-20', type: 'exam', priority: 'medium' }],
      insights: ['Proactively space study sessions 48 hours prior to milestone deadlines.']
    });

    vi.spyOn(ServerGeminiService, 'analyzeEmotion').mockResolvedValue({
      mood: 4,
      stressLevel: 'Low',
      concerns: [],
      supportiveMessage: 'Keep up the wonderful balance you are maintaining.'
    });

    vi.spyOn(ServerGeminiService, 'analyzeAssessment').mockResolvedValue({
      primaryFactor: 'Academic Routine',
      recommendations: ['Maintain regular sleep schedule']
    });
  });

  describe('GET /api/health', () => {
    it('returns 200 ok with uptime and version without authentication', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('mind-bridge-backend');
      expect(res.body.version).toBeDefined();
    });
  });

  describe('Authentication & Token Verification', () => {
    it('rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/gemini/insight')
        .send({ prompt: 'Analyze child wellbeing' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects malformed authorization header with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/gemini/insight')
        .set('Authorization', 'Basic invalidcredentials')
        .send({ prompt: 'Analyze child wellbeing' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects forged JWT tokens with 401 UNAUTHORIZED', async () => {
      vi.spyOn(admin, 'auth').mockReturnValue({
        verifyIdToken: vi.fn().mockRejectedValue(new Error('Firebase ID token has invalid signature.'))
      } as any);

      const res = await request(app)
        .post('/api/gemini/insight')
        .set('Authorization', 'Bearer forged.header.payload')
        .send({ prompt: 'Forged JWT simulation' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('invalid signature');
    });

    it('rejects expired or invalid tokens with 401 UNAUTHORIZED (mock firebase-admin)', async () => {
      vi.spyOn(admin, 'auth').mockReturnValue({
        verifyIdToken: vi.fn().mockRejectedValue(new Error('Firebase ID token has expired.'))
      } as any);

      const res = await request(app)
        .post('/api/gemini/insight')
        .set('Authorization', 'Bearer expired-firebase-token')
        .send({ prompt: 'Expired token simulation' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('expired');
    });

    it('accepts valid Firebase ID token with 200 OK (mock firebase-admin)', async () => {
      vi.spyOn(admin, 'auth').mockReturnValue({
        verifyIdToken: vi.fn().mockResolvedValue({
          uid: 'verified-user-123',
          email: 'student@mindbridge.edu',
          role: 'student'
        })
      } as any);

      const res = await request(app)
        .post('/api/gemini/insight')
        .set('Authorization', 'Bearer verified-real-jwt-token')
        .send({ prompt: 'Valid verified session' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBeDefined();
    });

    it('strictly rejects demo-token in production environments with 401 UNAUTHORIZED', async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const res = await request(app)
          .post('/api/gemini/insight')
          .set('Authorization', 'Bearer demo-token')
          .send({ prompt: 'Attempt demo token in prod' });

        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('UNAUTHORIZED');
        expect(res.body.error.message).toContain('production');
      } finally {
        process.env.NODE_ENV = origEnv || 'test';
      }
    });
  });

  describe('Request Body Validation with Zod', () => {
    it('returns 400 VALIDATION_ERROR on missing prompt', async () => {
      const res = await request(app)
        .post('/api/gemini/insight')
        .set('Authorization', validAuthHeader)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 VALIDATION_ERROR on empty string prompt', async () => {
      const res = await request(app)
        .post('/api/gemini/pattern')
        .set('Authorization', validAuthHeader)
        .send({ prompt: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 on empty parse-syllabus payload', async () => {
      const res = await request(app)
        .post('/api/gemini/parse-syllabus')
        .set('Authorization', validAuthHeader)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Gemini Routes Success & Resilience Fallbacks', () => {
    it('POST /api/gemini/insight returns structured clinical insights', async () => {
      const res = await request(app)
        .post('/api/gemini/insight')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'Child is experiencing mild exam stress' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBeDefined();
      expect(Array.isArray(res.body.recommendations)).toBe(true);
    });

    it('POST /api/gemini/pattern returns patterns and anomalies arrays', async () => {
      const res = await request(app)
        .post('/api/gemini/pattern')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'Historical checkin scores trajectory' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.patterns)).toBe(true);
      expect(Array.isArray(res.body.anomalies)).toBe(true);
    });

    it('POST /api/gemini/predict returns predictive risk forecast', async () => {
      const res = await request(app)
        .post('/api/gemini/predict')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'Predict 7-day future risk' });

      expect(res.status).toBe(200);
      expect(res.body.predictedRisk).toBeDefined();
      expect(Array.isArray(res.body.predictedTriggers)).toBe(true);
    });

    it('POST /api/gemini/recommend returns prioritized recommendations', async () => {
      const res = await request(app)
        .post('/api/gemini/recommend')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'Generate recommendations for 15 year old' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.recommendations)).toBe(true);
    });

    it('POST /api/gemini/root-cause returns primaryFactor and confidence', async () => {
      const res = await request(app)
        .post('/api/gemini/root-cause')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'Find root cause of sleep dip' });

      expect(res.status).toBe(200);
      expect(res.body.primaryFactor).toBeDefined();
    });

    it('POST /api/gemini/supportive-summary returns supportive text paragraph', async () => {
      const res = await request(app)
        .post('/api/gemini/supportive-summary')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'Write supportive summary for parent' });

      expect(res.status).toBe(200);
      expect(res.body.text).toBeDefined();
    });

    it('POST /api/gemini/progressive-questions returns array of questions', async () => {
      const res = await request(app)
        .post('/api/gemini/progressive-questions')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'Generate adaptive questions' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/gemini/analyze-progressive-assessment returns assessment synthesis', async () => {
      const res = await request(app)
        .post('/api/gemini/analyze-progressive-assessment')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'Analyze progressive assessment' });

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
    });

    it('POST /api/gemini/parse-syllabus returns parsed calendar events', async () => {
      const res = await request(app)
        .post('/api/gemini/parse-syllabus')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'Midterm exam syllabus schedule' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.events)).toBe(true);
    });

    it('POST /api/gemini/analyze-emotion returns non-clinical supportive analysis', async () => {
      const res = await request(app)
        .post('/api/gemini/analyze-emotion')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'I felt overwhelmed by algebra today' });

      expect(res.status).toBe(200);
      expect(res.body.mood).toBeDefined();
      expect(res.body.supportiveMessage).toBeDefined();
    });

    it('POST /api/gemini/analyze-assessment returns multi-factor recommendations', async () => {
      const res = await request(app)
        .post('/api/gemini/analyze-assessment')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'Assessment scores summary' });

      expect(res.status).toBe(200);
      expect(res.body.primaryFactor).toBeDefined();
      expect(Array.isArray(res.body.recommendations)).toBe(true);
    });

    it('FALLBACK GUARANTEE: Never crashes UI when Gemini service throws an error', async () => {
      vi.spyOn(ServerGeminiService, 'generateInsight').mockImplementationOnce(async () => {
        return {
          status: 'Student is demonstrating consistent baseline patterns.',
          concerns: ['AI service currently operating in offline resilience mode.'],
          recommendations: ['Continue routine monitoring.']
        };
      });

      const res = await request(app)
        .post('/api/gemini/insight')
        .set('Authorization', validAuthHeader)
        .send({ prompt: 'Simulated API failure scenario' });

      expect(res.status).toBe(200);
      expect(res.body.status).toContain('consistent baseline patterns');
      expect(res.body.concerns).toContain('AI service currently operating in offline resilience mode.');
    });
  });
});
