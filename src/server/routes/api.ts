import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { ServerGeminiService } from '../services/geminiService';

export const apiRouter = Router();

// ============================================================================
// Health Check Endpoint (Public / Unauthenticated for load balancers & monitoring)
// ============================================================================
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'mind-bridge-backend',
    version: '1.2.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const PromptRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty.')
});

export const SyllabusRequestSchema = z.object({
  prompt: z.string().optional(),
  parts: z.array(z.any()).optional()
}).refine(data => Boolean(data.prompt) || (Array.isArray(data.parts) && data.parts.length > 0), {
  message: 'Either prompt or parts must be provided.'
});

// ============================================================================
// Protected Gemini Routes (Requires Bearer Token)
// ============================================================================

apiRouter.post(
  '/gemini/insight',
  authenticateToken,
  validateBody(PromptRequestSchema),
  async (req: Request, res: Response) => {
    const result = await ServerGeminiService.generateInsight(req.body.prompt);
    res.json(result);
  }
);

apiRouter.post(
  '/gemini/pattern',
  authenticateToken,
  validateBody(PromptRequestSchema),
  async (req: Request, res: Response) => {
    const result = await ServerGeminiService.generatePattern(req.body.prompt);
    res.json(result);
  }
);

apiRouter.post(
  '/gemini/predict',
  authenticateToken,
  validateBody(PromptRequestSchema),
  async (req: Request, res: Response) => {
    const result = await ServerGeminiService.generatePrediction(req.body.prompt);
    res.json(result);
  }
);

apiRouter.post(
  '/gemini/recommend',
  authenticateToken,
  validateBody(PromptRequestSchema),
  async (req: Request, res: Response) => {
    const result = await ServerGeminiService.generateRecommendations(req.body.prompt);
    res.json(result);
  }
);

apiRouter.post(
  '/gemini/root-cause',
  authenticateToken,
  validateBody(PromptRequestSchema),
  async (req: Request, res: Response) => {
    const result = await ServerGeminiService.generateRootCause(req.body.prompt);
    res.json(result);
  }
);

apiRouter.post(
  '/gemini/supportive-summary',
  authenticateToken,
  validateBody(PromptRequestSchema),
  async (req: Request, res: Response) => {
    const result = await ServerGeminiService.generateSupportiveSummary(req.body.prompt);
    res.json(result);
  }
);

apiRouter.post(
  '/gemini/progressive-questions',
  authenticateToken,
  validateBody(PromptRequestSchema),
  async (req: Request, res: Response) => {
    const result = await ServerGeminiService.generateProgressiveQuestions(req.body.prompt);
    res.json(result);
  }
);

apiRouter.post(
  '/gemini/analyze-progressive-assessment',
  authenticateToken,
  validateBody(PromptRequestSchema),
  async (req: Request, res: Response) => {
    const result = await ServerGeminiService.analyzeProgressiveAssessment(req.body.prompt);
    res.json(result);
  }
);

apiRouter.post(
  '/gemini/parse-syllabus',
  authenticateToken,
  validateBody(SyllabusRequestSchema),
  async (req: Request, res: Response) => {
    const result = await ServerGeminiService.parseSyllabus(req.body.prompt, req.body.parts);
    res.json(result);
  }
);

apiRouter.post(
  '/gemini/analyze-emotion',
  authenticateToken,
  validateBody(PromptRequestSchema),
  async (req: Request, res: Response) => {
    const result = await ServerGeminiService.analyzeEmotion(req.body.prompt);
    res.json(result);
  }
);

apiRouter.post(
  '/gemini/analyze-assessment',
  authenticateToken,
  validateBody(PromptRequestSchema),
  async (req: Request, res: Response) => {
    const result = await ServerGeminiService.analyzeAssessment(req.body.prompt);
    res.json(result);
  }
);
