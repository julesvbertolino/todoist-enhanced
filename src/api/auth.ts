import { forgetCredentials, freshAccessToken, readCredentials } from './oauth';

/**
 * Where the credential comes from.
 *
 * Two ways in. Signing in with Todoist (OAuth, see oauth.ts) is the one the
 * connect screen offers first: nothing to copy, and the app shows up in the
 * person's Todoist integrations where it can be revoked. A personal API token
 * pasted by hand still works, for anyone who prefers it. Either way the rest
 * of the app only ever asks this file for "the token to send".
 */

const TOKEN_KEY = 'tde.token';

export interface AuthProvider {
  /** The bearer token to send, or null when the app is not connected. */
  getToken(): Promise<string | null>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}

class Auth implements AuthProvider {
  /* Only for a browser that blocks storage. Everywhere else the token is read
     from storage on every call: the desktop app runs the site in two windows
     at once, and a copy kept in memory at load let the Quick Add window go on
     sending with the account it opened on after the main window had signed in
     to another one. The device holds one credential, and every window uses it. */
  private memory: string | null;

  constructor() {
    const stored = readStoredToken();
    this.memory = stored === undefined ? null : stored;
  }

  private get token(): string | null {
    const stored = readStoredToken();
    return stored === undefined ? this.memory : stored;
  }

  /** True when the connection came from signing in, not from a pasted token. */
  get viaOAuth(): boolean {
    return !this.token && readCredentials() !== null;
  }

  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    return freshAccessToken();
  }

  /**
   * After a 401, one more try with a renewed access token — an hour can end
   * between the check and the request. Null when there is nothing to renew.
   */
  async renewAfterRefusal(rejectedAccessToken?: string): Promise<string | null> {
    return this.viaOAuth ? freshAccessToken(true, rejectedAccessToken) : null;
  }

  isConnected(): boolean {
    return (this.token !== null && this.token.length > 0) || readCredentials() !== null;
  }

  async set(token: string): Promise<void> {
    this.memory = token.trim();
    forgetCredentials();
    try {
      localStorage.setItem(TOKEN_KEY, this.memory);
    } catch {
      // A browser with storage blocked still works for the session in memory.
    }
  }

  /**
   * After signing in with Todoist: a token pasted earlier is forgotten. It
   * would otherwise go on being sent instead of the new sign-in, since a
   * pasted token is read first, and the app would stay on its account.
   */
  forgetPastedToken(): void {
    this.memory = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to clear */
    }
  }

  /**
   * Forgets the credential on this device. An OAuth grant stays listed in
   * Todoist's own integrations settings until it is removed there: revoking
   * it from here would need a client secret, which a page cannot keep.
   */
  async disconnect(): Promise<void> {
    this.memory = null;
    forgetCredentials();
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nothing to clear */
    }
  }
}

/** The stored token, null when there is none, undefined when storage is blocked. */
function readStoredToken(): string | null | undefined {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return undefined;
  }
}

export const auth = new Auth();

/** Rejects anything that cannot be a Todoist personal token before a call is made. */
export function looksLikeToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{20,}$/.test(value.trim());
}
