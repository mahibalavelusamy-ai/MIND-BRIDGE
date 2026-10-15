import { auth } from './firebase';

/**
 * Mind Bridge Authenticated API Client
 *
 * Automatically attaches the authenticated Firebase ID token as a Bearer token
 * in the Authorization header of outbound API requests to /api/*.
 * If unauthenticated or in offline demo mode, falls back to a deterministic demo token.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = 'demo-token';

  try {
    if (auth.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      if (idToken) {
        token = idToken;
      }
    }
  } catch {
    token = 'demo-token';
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers
  });
}
