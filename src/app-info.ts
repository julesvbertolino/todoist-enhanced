/**
 * What the app calls itself, and where it lives.
 *
 * The name follows Todoist's brand guidelines, which require a third-party
 * app to be named "x for Todoist" so it cannot be taken for an official
 * product, and require its description to say that it is not affiliated.
 * Both the sign-in screen and the About section read from here, so the two
 * cannot drift apart.
 */
export const APP_NAME = 'Enhanced for Todoist';
export const VERSION = '2.32.0';
export const AUTHOR = 'julesbertolino';
/** Public contact already used by the maintainer in the app. */
export const PRIVACY_EMAIL = 'jules.bertolino@alias-digital.fr';
/* A copy served with the app: the GitHub address redirects to another host first, which is why the photo arrived late. */
export const AUTHOR_AVATAR_URL = `${import.meta.env.BASE_URL}author.png`;

/** The official site, for the About section. A self-hosted copy's own address is PUBLIC_URL (vite.config.ts). */
export const SITE_URL = 'https://todoistenhanced.julesbertolino.fr';
export const GITHUB_URL = 'https://github.com/julesvbertolino/todoist-enhanced';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/julesbertolino/';
export const X_URL = 'https://x.com/julesvbertolino';
export const AUTHOR_GITHUB_URL = 'https://github.com/julesvbertolino';
export const COFFEE_URL = 'https://buymeacoffee.com/julesbertolino';
/** The Mac app lives in its own repository. The `latest/download` links never change from one release to the next. */
export const MAC_APP_URL = 'https://github.com/julesvbertolino/todoist-enhanced-desktop';
export const MAC_APP_RELEASES_URL = `${MAC_APP_URL}/releases/latest`;
export const MAC_APP_INSTALL_URL = `${MAC_APP_URL}#install-in-three-steps`;
/**
 * The newest Mac app whose download is on the release page. The app has no
 * automatic update (it is not signed), so the site compares this with the
 * version the app reports and offers the download. Raise it only once the
 * release is published, in the same deploy as nothing else depends on.
 */
export const MAC_APP_LATEST = '1.1.0';
export const MAC_APP_DOWNLOAD_URL = {
  arm64: `${MAC_APP_URL}/releases/latest/download/Enhanced-for-Todoist-arm64.dmg`,
  x64: `${MAC_APP_URL}/releases/latest/download/Enhanced-for-Todoist-x64.dmg`,
} as const;
/** Where a bug or an idea goes. The same form the README and GitHub point at. */
export const FEEDBACK_URL = 'https://forms.fillout.com/t/79WYJmkgqkus';
export const TODOIST_DEVELOPER_URL =
  'https://app.todoist.com/app/settings/integrations/developer';
