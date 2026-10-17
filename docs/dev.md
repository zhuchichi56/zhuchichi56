# Development log

## 2026-10-17 — GitHub AI usage card

- Question: Explain Vibe Usage accounting and add a similar card to the GitHub profile.
- Analysis / Root cause: The profile repository has PROFILE.md but no README.md. Usage lives on the local computer; GitHub Actions cannot read it. Codex cache/replay handling requires a proper parser. Token-derived API estimates are not subscription payments.
- Solution: Prepare a locally generated SVG using the pinned upstream Codex parser. Only allow-listed summary fields may be published; raw logs, project names, machine names, and conversations stay local. Pricing is opt-in and unsupported models remain unpriced.
- Files changed: package.json, package-lock.json, scripts/, docs/, README.md, assets/.
- Validation: Accounting and privacy tests passed; the real-data SVG was rendered and visually inspected. Git push permission was verified with a dry run. An initial fetch stalled because command-line Git did not inherit the macOS system proxy; the publisher now honors the existing HTTPS proxy and bounds Git network timeouts.
- Result: Published the card to the profile README and verified it visually on the public GitHub profile. Only aggregate usage was published. Updates are explicit local runs; no background service was installed.
- Commit hash: `40c4ac6` (implementation), `3ada4e6` (proxy support), `91c0e40` (published usage snapshot); this log update is recorded in the following commit.
