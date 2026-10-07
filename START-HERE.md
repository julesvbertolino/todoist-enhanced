# Start here (for Ken)

This kit lets Claude Code build the Customers, Manage, Initiatives, Goals &
KPIs and Objectives views into your own copy of Enhanced for Todoist, and keep
it updatable when the original changes.

## What's in the kit

| File | For |
| --- | --- |
| `CLAUDE.md` | Claude Code reads this automatically: the rules of the fork |
| `docs/ext/SPEC.md` | What each view does |
| `docs/ext/DATA-MODEL.md` | How it maps onto Todoist labels, tasks and stored data |
| `docs/ext/BUILD-PLAN.md` | 11 phases (0–10), each with a prompt to paste |
| `docs/ext/mockup/` | The mockup's markup and logic, as a reference |
| `.github/workflows/sync-upstream.yml`, `scripts/sync-upstream.sh` | Weekly pull request with upstream updates |
| `public/_headers` | Security headers for Cloudflare Pages |
| `UPDATING.md` | How updates arrive and how to merge them |

## Steps

1. **Fork** `github.com/julesvbertolino/todoist-enhanced` on GitHub. The fork
   can be private.
2. **Clone it** and copy everything from this kit into the repo root, keeping
   the folders.
   ```bash
   git clone https://github.com/<you>/todoist-enhanced.git
   cd todoist-enhanced
   unzip ~/Downloads/claude-code-kit.zip -d .
   chmod +x scripts/sync-upstream.sh
   git add -A && git commit -m "Add build kit" && git push
   ```
3. **GitHub settings:** Actions, then General. Set workflow permissions to
   "Read and write" and tick "Allow GitHub Actions to create and approve pull
   requests".
4. **Cloudflare Pages:** Workers & Pages, Create, Pages, Connect to Git, then
   the fork.
   - Build command: `npm run build`
   - Output directory: `dist`
   - Variables: `NODE_VERSION=22` and `PUBLIC_URL=https://<project>.pages.dev/`
     (or your custom domain).
   - Optional: Zero Trust, then Access, to put an email login in front of it.
5. **Open Claude Code** in the repo folder (`claude`). Then, phase by phase:
   - paste the phase's **Prompt** from `docs/ext/BUILD-PLAN.md`;
   - let it plan, approve the plan, and let it build;
   - check the PR's Cloudflare preview (use "Explore with demo data");
   - merge, then start the next phase. A fresh Claude Code session per phase
     keeps it focused (`/clear`).

Start with this:

> Read CLAUDE.md and docs/ext/BUILD-PLAN.md Phase 0. Do Phase 0 only.

## Tips

- If Claude Code wants to change an upstream file that isn't in CLAUDE.md's
  hook list, ask it why, and whether it can live in `src/ext/` instead.
- If something in the spec turns out wrong in real use, edit `SPEC.md` first,
  then ask Claude Code to "bring the code in line with SPEC.md §…". The spec
  stays the source of truth.
- Real data: before Phase 4 on your real account, create the labels you
  already use for customers. Manage → Customers will offer to register them.
