# Uploading a build

The build is a static site: `npm run build` puts it in `dist/`, and any host
that serves files will do. What follows is the part that is easy to get wrong.

Upload the **whole** of `dist/`, `assets/` and the dotfile included. Every
other file sits at the root, which is deliberate: the icons used to live in
`dist/icons/`, that folder was dropped by an upload twice, and the second
failure left a directory on the server that could not be read into or
repaired by re-uploading. A manifest whose icons all 404 fails the browser's
installability check silently — the app looks and works perfectly, it simply
stops offering to install and the installed copy has no icon of its own.

Two things to check after an upload:

```bash
curl -o /dev/null -w '%{http_code}\n' https://<host>/icon-192.png   # 200
curl -o /dev/null -w '%{content_type}\n' https://<host>/manifest.webmanifest
curl -s https://<host>/oauth/client.json | head -c 40                     # {"client_id"…
curl -sI https://<host>/ | grep -i content-security-policy
```

The second should say `application/manifest+json`. It comes from `.htaccess`,
which ships in `dist/` — a dotfile, so a client set to hide them will skip it.

The third is what "Continue with Todoist" depends on: Todoist fetches that
file to identify the app. The build writes it for `PUBLIC_URL`, the official
site by default; a copy hosted anywhere else must be built with
`PUBLIC_URL=https://<host>/ npm run build` (see "Self-hosting" in the README),
and the file's `client_id` should then start with that address. If it answers with the app's own page instead, the
`oauth/` folder was not uploaded and Todoist replies `invalid_client`. The
fourth checks that `.htaccess` is in place; without it the app still works,
without its Content-Security-Policy.

## Cloudflare Workers Static Assets

`wrangler.jsonc` serves `dist/` as static assets, with SPA navigation fallback;
no Worker script or backend is needed. `public/_headers` provides the security
and cache headers that Apache normally supplies through `.htaccess`. Keep both
policies and Vite's preview headers in sync. Apache still uses `.htaccess`.

Use Node 22 and `npm run build`. In Workers Builds, the deploy command is
`npx wrangler deploy`; do not add `--assets` once the repository configuration
is present. Before connecting the production hostname, check the actual branch
and deployment settings: a push to the production branch can deploy immediately.
For an approval-controlled release, disable automatic deployment or use
`npx wrangler versions upload` and explicitly promote the intended version.
Preview builds for other branches can be enabled separately.

### Testing before the DNS change

The existing production domain must remain on the current host during testing.
Build a test copy with `PUBLIC_URL=https://<stable-test-host>/` and deploy it
to that exact HTTPS host. The app's OAuth client ID and callback are built for
one address; a hash-based or branch preview URL is not interchangeable with
another host. Preview builds may require their own build variable and must be
tested at the exact address used to build them. The normal production build
must instead use the official URL (unset `PUBLIC_URL`, or set it explicitly).
Do not protect `oauth/client.json` behind Cloudflare Access or a challenge:
Todoist must be able to fetch it without authentication. A test account or demo
mode avoids changing real Todoist tasks during initial checks.

On the test host, check the four URLs above, `sw.js`, `theme-boot.js` and
`oauth/client.json`, their cache headers, navigation fallback and a missing
asset. Confirm OAuth sign-in, API token sign-in, synchronization, installation,
offline use, reconnect, and the update prompt after a second deployment. Verify
the same on the official hostname after cutover, including an already installed
app and a fresh browser. Real OAuth and PWA tests require the deployed host;
a local build alone does not establish that they work on Cloudflare.

Workers Custom Domains require an active Cloudflare DNS zone. Inspect existing
DNS records, mail records and any conflicting CNAME before planning the move;
do not assume a CNAME at another DNS provider is sufficient. Keep the old host
available and document the precise rollback before changing DNS. Compare loading
performance in similar conditions before and after the switch.
