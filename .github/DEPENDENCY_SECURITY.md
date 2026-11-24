# Dependency security

Maintainer: SignalSafeSoftware repository owners. Review this baseline monthly and
when workflows, package managers, default branches or publishing methods change.

## Protection baseline

- Dependabot alerts, dependency graph and automatic security updates are enabled.
- `.github/dependabot.yml` schedules version updates for the repository's owned
  manifests and workflows. Keep documented compatibility ignores; a major upgrade
  requires its normal coordinated migration.
- Every pull request runs `Dependency review`: GitHub dependency review (new high/critical vulnerabilities in runtime, development and unknown scopes).
- The default branch (`main`) uses the `Dependency protection`
  repository ruleset: pull requests, resolved conversations and required checks;
  deletion and force pushes are blocked. No routine bypass is configured.
- Independent review is required where the project's contribution instructions
  require it. The ruleset does not require an unavailable second maintainer's
  approval in this single-maintainer organization.

## Required check contexts

- `Checks (Node 22)`
- `Checks (Node 24)`
- `Dependency review`
- `Smoke package (Node 22)`
- `Smoke package (Node 24)`
- `SonarCloud scan`
- `Tests (Node 22)`
- `Tests (Node 24)`

These names match GitHub Actions check contexts. After a workflow/job rename,
update the ruleset in repository Settings → Rules before relying on the new name.
Keep required workflows eligible for every pull request to the protected branch;
workflow-level path filters can otherwise leave required checks pending forever.

## Handling dependency updates

Inspect the release notes and dependency diff. Merge only after the required and
applicable checks pass. Major versions, peer/runtime changes and documented
compatibility exceptions require review and relevant integration verification;
no blanket Dependabot auto-merge is configured. Vulnerability alerts can exist
before a patch is available; enabling protection does not resolve that backlog.
Do not dismiss an alert merely to obtain a passing check.

## npm publishing

Publishing uses the configured GitHub Actions trusted publisher and short-lived
OIDC credentials. A successful tagged OIDC publication was verified during the
November 2026 migration. npm publishing jobs do not read `NPM_TOKEN` or
`NODE_AUTH_TOKEN` secrets. Keep registry-install credentials separate from
publishing and never restore a permanent publish token as a fallback.
