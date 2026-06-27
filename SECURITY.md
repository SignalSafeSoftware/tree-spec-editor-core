# Security Policy

## Supported versions

Node.js 20.19 or newer (see `package.json` `engines`). Only the latest published release line receives security fixes.

## Reporting a vulnerability

Please report suspected security vulnerabilities **privately**. Do **not** open a public GitHub issue for security reports.

Email: security@signalsafe.software

Include a description, reproduction steps, affected versions, and impact if known. We aim to acknowledge reports within five business days.


## Security boundaries

This package provides **framework-agnostic editor state and helpers** (no React, no DOM).

- It manipulates TreeSpec authoring data in memory. It does not authenticate users, authorize edits, or persist data to a server.
- Host applications must enforce authorization, validate content server-side, and control who may create or publish scenarios.
- Do not pass untrusted TreeSpec JSON directly into production publish flows without host-side validation.
