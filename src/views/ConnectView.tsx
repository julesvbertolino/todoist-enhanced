import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { TodoistMark } from '@/components/TodoistMark';
import { WorkspacePreview } from '@/components/WorkspacePreview';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { looksLikeToken } from '@/api/auth';
import { beginSignIn, builtForElsewhere } from '@/api/oauth';
import type { TranslationKey } from '@/i18n';
import { AUTHOR, GITHUB_URL, TODOIST_DEVELOPER_URL, VERSION } from '@/app-info';


/**
 * The first screen: connecting the account.
 *
 * Signing in with Todoist comes first: one button, Todoist's own consent
 * page, and back here connected, with nothing to find or copy. A personal
 * API token still works, one click further down, for anyone who prefers it.
 * Whatever the way in, the credential stays on the device and goes nowhere
 * but Todoist, which is why the privacy note sits right under the buttons.
 */
export function ConnectView() {
  const { t } = useT();
  const connect = useStore((s) => s.connect);
  const startDemo = useStore((s) => s.startDemo);
  const setLocale = useStore((s) => s.setLocale);
  const locale = useStore((s) => s.prefs.locale);

  const signInError = useStore((s) => s.signInError);

  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'invalid' | 'malformed'>('idle');
  const [leaving, setLeaving] = useState(false);
  /** The address this copy was built for, once a sign-in has been refused for it. */
  const [elsewhere, setElsewhere] = useState<string | null>(null);
  /** Site storage is blocked, so a sign-in through Todoist's page cannot come back. */
  const [storageBlocked, setStorageBlocked] = useState(false);
  // The token route opens by itself when it is what failed, or what the sign-in fell back to.
  const [tokenOpen, setTokenOpen] = useState(signInError === 'failed');

  async function submit() {
    if (!looksLikeToken(token)) {
      setStatus('malformed');
      return;
    }
    setStatus('checking');
    const ok = await connect(token);
    if (!ok) setStatus('invalid');
  }

  const legal = t('connect.legal', { author: AUTHOR }).split(AUTHOR);

  return (
    <div className="signin">
      <div className="signin-lang seg2" role="group" aria-label={t('settings.language')}>
        {(['en', 'fr'] as const).map((value) => (
          <button key={value} aria-pressed={locale === value} onClick={() => setLocale(value)}>
            {value === 'en' ? 'English' : 'Français'}
          </button>
        ))}
      </div>

      {/* What the app is for, on the bubble. Decorative as far as the sign-in
          goes: nothing here needs to be read to connect. */}
      <aside className="signin-bubble">
        <h2>{t('connect.pitch')}</h2>
        <ul className="signin-checks">
          {(['week', 'estimates', 'time', 'review', 'quick', 'matrix'] as const).map((key) => (
            <li key={key}>
              <span className="signin-check"><Icon name="check" size="sm" /></span>
              {t(`connect.feature.${key}` as TranslationKey)}
            </li>
          ))}
        </ul>
        <div className="signin-mock"><WorkspacePreview stage="login" layout="stage" /></div>
      </aside>

      <main className="signin-main">
        <div className="connect-form">
        <h1>{t('connect.login')}</h1>
        <p className="connect-intro">{t('connect.intro')}</p>

        <button
          className="btn primary lg connect-submit"
          disabled={leaving}
          onClick={() => {
            const expected = builtForElsewhere();
            if (expected) { setElsewhere(expected); setTokenOpen(true); return; }
            setLeaving(true);
            void beginSignIn().then((left) => {
              if (left) return;
              setLeaving(false);
              setStorageBlocked(true);
              setTokenOpen(true);
            });
          }}
        >
          {leaving ? t('connect.oauthLeaving') : (() => {
            // "Connect with Todoist": the mark goes in front of the word.
            const [before, after] = t('connect.oauth').split('Todoist');
            return after === undefined ? t('connect.oauth') : <>{before}<TodoistMark /> Todoist{after}</>;
          })()}
        </button>
        {signInError === 'denied' && <p className="connect-error">{t('connect.oauthDenied')}</p>}
        {signInError === 'failed' && <p className="connect-error">{t('connect.oauthFailed')}</p>}
        {storageBlocked && <p className="connect-error" role="alert">{t('connect.storageBlocked')}</p>}
        {elsewhere && (
          <p className="connect-error">
            {t('connect.oauthElsewhere', {
              expected: elsewhere,
              here: `${window.location.origin}${window.location.pathname}`,
            })}
          </p>
        )}

        <button className="btn soft lg connect-demo" onClick={startDemo}>
          {t('connect.demoInstead')}
        </button>

        <details
          className="connect-token"
          open={tokenOpen}
          onToggle={(e) => setTokenOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary>{t('connect.useToken')}</summary>

          <label className="sr" htmlFor="token">{t('connect.tokenLabel')}</label>
          <input
            id="token"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={t('connect.tokenPlaceholder')}
            value={token}
            onChange={(e) => { setToken(e.target.value); setStatus('idle'); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          />

          {status === 'invalid' && <p className="connect-error">{t('connect.invalid')}</p>}
          {status === 'malformed' && <p className="connect-error">{t('connect.malformed')}</p>}

          <button
            className="btn lg connect-token-submit"
            disabled={status === 'checking'}
            onClick={() => void submit()}
          >
            {status === 'checking' ? t('connect.checking') : t('connect.submit')}
          </button>

          <a
            className="connect-apikey"
            href={TODOIST_DEVELOPER_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('connect.apiKey')}
          </a>
        </details>

        <p className="connect-privacy">
          <Icon name="eye" size="sm" />
          <span><strong>{t('connect.privacyLead')}</strong>{' '}
          {t('connect.privacyBody')}{' '}
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size="sm" />
            {t('connect.github')}
          </a></span>
        </p>

        <p className="connect-legal">
          {legal[0]}<strong>{AUTHOR}</strong>{legal[1]}
        </p>
        </div>

        <footer className="signin-brand">
          <strong className="signin-brand-name">{t('connect.appName')}</strong>
          <small>{t('connect.version', { version: VERSION })}</small>
        </footer>
      </main>
    </div>
  );
}
