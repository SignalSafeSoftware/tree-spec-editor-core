# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-06-26

### Added

- `SECURITY.md`, Dependabot, `CHANGELOG.md`, updated [RELEASING.md](./RELEASING.md).

### Changed

- Package metadata and README (Batches 3–4).

### CI

- Checks and tests on every PR; Sonar **`scan`** is label-gated on PRs and runs on tag push and manual dispatch (Batch 1).
- Publish only from manual **`main`** dispatch or **`v*`** tags (not PR labels); publish requires **`checks`**, **`tests`**, and **`scan`**.

[Unreleased]: https://github.com/SignalSafeSoftware/tree-spec-editor-core/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/SignalSafeSoftware/tree-spec-editor-core/releases/tag/v0.1.2
