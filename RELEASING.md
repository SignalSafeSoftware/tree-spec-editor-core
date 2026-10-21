# Releasing @signalsafe/tree-spec-editor-core

## Release 0.2.3

The coordinated release was approved on 2026-10-21. Publish only the reviewed source revision and verified archive after the required checks; this document does not assert registry availability.

The supported editor chain is TreeSpec `^0.4.4` → editor-core `^0.2.3` → editor-react `^0.3.3` → editor `0.4.1`, with the CSS-only theme `0.3.7`. Publish and verify each upstream registry archive before releasing its dependent. React packages retain React/React DOM 18 and React Flow 11; the theme has no runtime JavaScript dependencies.

## Verification

Use the committed lockfile and Node 22.12+; CI checks Node 22 and 24. Before release, run the package scripts declared in `package.json`, inspect `npm pack --dry-run`, and test downstream packages using the exact packed candidate. Record local candidate proof separately from a smoke test that installs published dependencies. A registry smoke test remains pending until its required upstream version is available.

After successful hosted checks at the approved revision, the existing `.github/workflows/ci.yml` publishes on an approved `v*` tag. Manual dispatch runs verification without publishing. Preserve the workflow's checks, tests, scan, smoke, and publish conditions as applicable; inspect their actual results before a release. Verify registry metadata and downloaded archive contents after publication, then update host declarations and locks together and run host integration checks.

## Historical release notes

The following records describe earlier release preparation; their version pins and sequencing are historical.

## Releasing `@signalsafe/tree-spec-editor-core`

Standalone repository: [SignalSafeSoftware/tree-spec-editor-core](https://github.com/SignalSafeSoftware/tree-spec-editor-core).

## Requirements

- Node.js **>=22.12.0** for local development, CI, and publish smoke (see `package.json` `engines`). Node 20 is no longer supported (GitHub Actions Node 20 deprecation).

**Depends on:** `@signalsafe/tree-spec`.

## CI publish policy

- **Checks and tests** run on every pull request.
- **`scan` (Sonar)** on pull requests is **optional** — it runs only when the PR has the **`scan`** label. On **`push`** (including **`v*`** tag pushes) and **`workflow_dispatch`**, **`scan`** runs automatically.
- **Publish does not run** from PR labels.
- **Publish runs** when:
  - **Manual:** GitHub Actions → **CI** → **Run workflow** on branch **`main`**, or
  - **Tag:** push a semver tag matching `v*` (for example `vX.Y.Z`).
- **Publish requires** successful **`checks`**, **`tests`**, and **`scan`** jobs in the same workflow run (see [`.github/workflows/ci.yml`](https://github.com/SignalSafeSoftware/tree-spec-editor-core/blob/main/.github/workflows/ci.yml)).
- Pushing a **`v*`** tag starts a workflow run where **`checks`**, **`tests`**, and **`scan`** run before **Publish** can proceed.
- **GitHub Releases do not trigger publish** in the current workflow.
- **No npm Environment approval or provenance** in CI today.

## CI tooling and npm auth

- Local development and CI use **Yarn** for `install`, `test`, `build`, and `smoke:package`.
- CI **publish** uses **`npm publish`** (non-interactive; compatible with 2FA-enabled npm accounts when auth is configured correctly).
- Set the GitHub Actions secret **`NPM_TOKEN`** to a publish-capable npm token unless **npm trusted publishing/OIDC** is configured for the repository.
- If the npm account or package requires **2FA for publish**, the token must support non-interactive publishing — for example a granular access token with read/write package access and **2FA bypass enabled for write actions**, or npm trusted publishing/OIDC.
- CI writes auth to `~/.npmrc` only; no `.npmrc` is committed to the repository.
- CI does not run `npm version` or bump versions during publish; the committed `package.json` version is published as-is.

## Before you release

1. Bump `version` in `package.json` (and `@signalsafe/tree-spec` in `dependencies` if needed).
2. Update [CHANGELOG.md](./CHANGELOG.md) (`[Unreleased]` → new version section when tagging).
3. Run locally:

   ```bash
   yarn install --frozen-lockfile
   yarn typecheck
   yarn test
   yarn build
   npm publish --dry-run
   ```

4. Run artifact smoke test: `yarn smoke:package` (pack, temp consumer install, export/type checks — enforced in CI before publish).

## Publish

1. Commit the version and changelog updates on **`main`**:

   ```bash
   git add package.json CHANGELOG.md
   git commit -m "Release vX.Y.Z"
   git push origin main
   ```

2. Tag and push (recommended — triggers **Publish** when required jobs succeed):

   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

   **Option B — Manual dispatch:** merge release commits to **`main`**, then GitHub → **Actions** → **CI** → **Run workflow** (branch **`main`**). Ensure `package.json` `version` matches the release you intend to ship.

## After publish

```bash
npm view @signalsafe/tree-spec-editor-core version
```

CI runs `yarn smoke:package`, logs the package version, then publishes with `npm publish` using `NPM_TOKEN` auth.
