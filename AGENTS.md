# Development rules

## Scope

`@signalsafe/tree-spec-editor-core` is the framework-free editor model: tree state, adapters, history, merge and layout helpers over `@signalsafe/tree-spec`. It must not import React, DOM APIs or UI-kit code; presentation belongs to `tree-spec-editor-react` and `tree-spec-editor`.

- Reuse `@signalsafe/tree-spec` for parsing, constants and lint instead of re-implementing wire rules. Graph rules that exist in both packages must have one owner (tree-spec).
- Keep `@signalsafe/tree-spec` on the current minor range. On 0.x, `^0.3.x` cannot resolve 0.4.x and installs a second copy in consumers.
- Public API is the root export; do not add re-exports or compatibility aliases. `tests/package-boundary.test.ts` guards the boundary.

## Quality gates

Run `yarn typecheck`, `yarn test:coverage` and `yarn smoke:package`.

## Releases

Follow `.codex/skills/ecosystem-release/SKILL.md`. Release order: tree-spec, editor-core, editor-react, editor, then hosts. Never tag, publish or push without explicit user approval.
