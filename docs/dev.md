# Development log

## 2026-10-17 — GitHub AI usage card

- Question: Explain Vibe Usage accounting and add a similar card to the GitHub profile.
- Analysis / Root cause: The profile repository has PROFILE.md but no README.md. Usage lives on the local computer; GitHub Actions cannot read it. Codex cache/replay handling requires a proper parser. Token-derived API estimates are not subscription payments.
- Solution: Prepare a locally generated SVG using the pinned upstream Codex parser. Only allow-listed summary fields may be published; raw logs, project names, machine names, and conversations stay local. Pricing is opt-in and unsupported models remain unpriced.
- Files changed: package.json, package-lock.json, scripts/, docs/, README.md, assets/.
- Commit hash: Pending implementation and review.
