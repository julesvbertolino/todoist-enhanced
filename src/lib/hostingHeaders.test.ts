import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('hosting security policy', () => {
  it('keeps the Cloudflare static response headers aligned with Apache', () => {
    const apache = readFileSync('public/.htaccess', 'utf8');
    const cloudflare = readFileSync('public/_headers', 'utf8');
    for (const name of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) {
      const original = apache.match(new RegExp(`Header always set ${name} "([^"]+)"`))?.[1];
      const copy = cloudflare.match(new RegExp(`^  ${name}: (.+)$`, 'm'))?.[1];
      expect(original, `Missing Apache ${name}`).toBeTruthy();
      expect(copy, `Cloudflare ${name} differs from Apache`).toBe(original);
    }
  });
});
