# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

No unreleased changes recorded.

## [0.2.1] - 2026-09-08

### Fixed

- Treat reachable cycles with an exit to `END` as valid terminal paths, matching
  the shared TreeSpec graph contract and the Adventure Stories consumer.

## [0.2.0] - 2026-09-08

### Added

- Pure `mergeEditorTrees` three-way graph merging with explicit merged/conflict
  results, stable collection ordering, and deletion/null/overlap diagnostics.

### Fixed

- Memoize editor graph terminal-path analysis so heavily converging graphs avoid
  repeated traversal while preserving the all-paths-to-END result and cycle handling.

## [0.1.6] - 2026-08-28

### Changed

- Require `@signalsafe/tree-spec` **^0.3.4** and lock the package build to the published `0.3.4` release.

## [0.1.5] - 2026-08-28

### Added

- Tests: expanded dispatch, transition, and package-boundary coverage.

### Changed

- Raise minimum supported Node.js to **>=22.12.0** (`engines.node`); CI matrix tests **22** and **24** only (Node 20 dropped due to GitHub Actions Node 20 deprecation).
- Updated the TypeScript 7-compatible build configuration and CI action dependencies.

## [0.1.3] - 2026-06-26

### Fixed

- Clear monorepo `paths` from standalone `tsconfig.build.json` so local `yarn build` works outside the monorepo.

### Changed

- Standardize development on Yarn 1.22.22 (`packageManager`, README dev commands).
- Bump `@signalsafe/tree-spec` dependency to `^0.3.2`.

## [0.1.2] - 2026-06-26

### Added

- `SECURITY.md`, Dependabot, `CHANGELOG.md`, updated [RELEASING.md](./RELEASING.md).
- Expanded unit test coverage.
- Package artifact smoke test (`yarn smoke:package`).

### Changed

- Package metadata and README (Batches 3–4).

### CI

- Checks and tests on every PR; Sonar **`scan`** is label-gated on PRs and runs on tag push and manual dispatch (Batch 1).
- Publish only from manual **`main`** dispatch or **`v*`** tags (not PR labels); publish requires **`checks`**, **`tests`**, and **`scan`**.

[Unreleased]: https://github.com/SignalSafeSoftware/tree-spec-editor-core/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/SignalSafeSoftware/tree-spec-editor-core/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/SignalSafeSoftware/tree-spec-editor-core/compare/v0.1.6...v0.2.0
[0.1.6]: https://github.com/SignalSafeSoftware/tree-spec-editor-core/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/SignalSafeSoftware/tree-spec-editor-core/compare/v0.1.4...v0.1.5
[0.1.3]: https://github.com/SignalSafeSoftware/tree-spec-editor-core/releases/tag/v0.1.3
[0.1.2]: https://github.com/SignalSafeSoftware/tree-spec-editor-core/releases/tag/v0.1.2
