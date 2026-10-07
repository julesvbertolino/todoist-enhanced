# Keeping this fork up to date

This is a fork of [todoist-enhanced](https://github.com/julesvbertolino/todoist-enhanced)
with extra views (customers, initiatives, goals and KPIs, objectives, manage).
New upstream versions arrive as a pull request. You review a preview, then
merge. Merging deploys.

## One-time setup

1. On GitHub, fork `julesvbertolino/todoist-enhanced`. Add these files to the
   fork's `main`: `.github/workflows/sync-upstream.yml`,
   `scripts/sync-upstream.sh`, `public/_headers`, `UPDATING.md`.
2. Repo settings, Actions, General: set *Workflow permissions* to
   "Read and write" and tick "Allow GitHub Actions to create and approve pull
   requests".
3. Cloudflare dashboard, Workers & Pages, Create, Pages, Connect to Git, pick
   the fork.
   - Production branch: `main`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variables: `NODE_VERSION=22` and
     `PUBLIC_URL=https://<your-pages-or-custom-domain>/`
   Every other branch, including sync branches, gets its own preview URL.
4. Optional: Zero Trust, Access, add an application for the domain so only
   your email can open it.

## How an update arrives

- Every Monday (and whenever you press "Run workflow" on the Actions tab,
  Sync upstream) the workflow checks the original repo.
- Nothing new: nothing happens.
- New and it merges cleanly: a pull request "Sync upstream (vX.Y.Z)" opens. Its
  description says whether typecheck, tests and build passed and lists the
  changelog lines. Open the Cloudflare preview link, click through your views,
  then merge.
- New but it conflicts: an issue lists the conflicting files. Merge by hand:

      git fetch upstream
      git checkout -b sync/manual main
      git merge upstream/main
      # resolve, then: npm run typecheck && npm test && npm run build
      git push -u origin sync/manual     # open a pull request

- Something wrong after a merge: Cloudflare, Deployments, pick the previous
  deployment, Rollback. Then revert the merge commit in GitHub.

## What keeps merges easy

Conflicts only happen in files you changed and upstream changed too. So:

- Put every new view, helper and style in its own files under `src/ext/`
  (views, components, domain rules, styles). Upstream never touches these.
- Change core files only where an extra view has to plug in: the route switch
  in `src/App.tsx`, the sidebar list in `src/components/Sidebar.tsx`, the
  route and translation types. Keep each change a few lines that import from
  `src/ext/`, so a conflict is small and obvious.
- Do not reformat or rename upstream files.
- Keep the Content-Security-Policy in `public/_headers` and
  `preview.headers` in `vite.config.ts` in step. If a new view fetches from
  another host, add it to connect-src in both.
