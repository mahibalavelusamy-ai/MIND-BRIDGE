import { Request, Response, NextFunction } from 'express';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';
import fs from 'fs';

/**
 * Initialize Firebase Admin SDK if not already initialized.
 * Supports FIREBASE_SERVICE_ACCOUNT (JSON string or file path)
 * or standard GOOGLE_APPLICATION_CREDENTIALS.
 */
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      const serviceAccount = saRaw.startsWith('{')
        ? JSON.parse(saRaw)
        : JSON.parse(fs.readFileSync(saRaw, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'ai-studio-d4cf7d3e-7283-4a18-a042-c653dd4522ea'
      });
    }
  } catch {
    try {
      initializeApp({
        projectId: 'ai-studio-d4cf7d3e-7283-4a18-a042-c653dd4522ea'
      });
    } catch {
      // Ignore re-init error in test or sandbox environments
    }
  }
}

/**
 * Compatibility admin wrapper providing the standard admin.auth() interface.
 */
export const admin = {
  get apps() {
    return getApps();
  },
  initializeApp,
  credential: {
    cert
  },
  auth(): Auth {
    return getAuth();
  }
};

/**
 * Authentication Middleware for Mind Bridge API
 *
 * Enforces real Firebase ID token verification using firebase-admin across all protected API routes.
 *
 * Why:
 * Healthcare and wellness applications handling student emotional and psychological telemetry
 * must guarantee that only authenticated and authorized callers can invoke AI inference
 * or access processing endpoints.
 *
 * Security Invariants:
 * 1. Missing or non-Bearer authorization headers return 401 UNAUTHORIZED.
 * 2. Empty tokens return 401 UNAUTHORIZED.
 * 3. 'demo-token', 'test-token', or 'demo-role-*' shortcuts are allowed ONLY when
 *    NODE_ENV === 'test' OR (DEMO_MODE === 'true' AND NODE_ENV !== 'production').
 * 4. Demo tokens are strictly rejected with 401 UNAUTHORIZED in production environments.
 * 5. All other tokens are verified against Firebase Admin via admin.auth().verifyIdToken(token).
 * 6. Any verification failure (expired, forged, malformed, revoked) returns 401 UNAUTHORIZED.
 *    No catch-all bypass is permitted.
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header. Expected Bearer token.'
      }
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Empty authorization token provided.'
      }
    });
    return;
  }

  const isTestEnv = process.env.NODE_ENV === 'test';
  const isProduction = process.env.NODE_ENV === 'production';
  const isDemoMode = process.env.DEMO_MODE === 'true';
  const isDemoShortcut =
    token === 'demo-token' ||
    token === 'test-token' ||
    token === 'mock-token' ||
    token.startsWith('demo-role-');

  // Handle demo / test token shortcuts
  if (isDemoShortcut) {
    if (isTestEnv || (isDemoMode && !isProduction)) {
      (req as any).user = {
        uid: token.startsWith('demo-role-') ? token.replace('demo-role-', '') : 'demo-user',
        email: 'demo@mindbridge.local',
        role: token.startsWith('demo-role-') ? token.replace('demo-role-', '') : 'student',
        isDemo: true
      };
      next();
      return;
    } else {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Demo tokens are strictly forbidden in production environments.'
        }
      });
      return;
    }
  }

  // Real Firebase ID token verification using admin.auth().verifyIdToken(token)
  try {
    const decodedToken: DecodedIdToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (err: any) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: err?.message || 'Invalid or expired Firebase ID token.'
      }
    });
  }
}
