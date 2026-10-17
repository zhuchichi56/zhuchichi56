# AI usage card

The profile card reports the last 30 calendar days in **Asia/Shanghai**, including today. It uses local Codex history on the machine running the collector. Remote servers and other AI tools are not included.

## Accounting

- Collector: the Codex parser from the MIT-licensed [Vibe Usage CLI](https://github.com/vibe-cafe/vibe-usage), pinned to npm version 0.14.3. Its local parser handles duplicate files, cumulative token counters, forks, and replayed subagent history. No VibeCafé account or cloud sync is used.
- Total tokens = uncached input + cached input + visible output + reasoning. The upstream parser separates these categories; reasoning is included once in the displayed output total. Cache writes, if present, are included in uncached input.
- Cache hit rate = cached input / (cached input + uncached input).
- Sessions = unique parser session hashes overlapping the period. It is not a request count or a measure of human working time.
- Daily bars and hourly heatmap measure token volume, using the parser's 30-minute buckets. The heatmap groups corresponding weekdays and hours across the whole period.
- Estimated USD cost = `(uncached input × input price + cache reads × cache price + output including reasoning × output price) / 1,000,000`, summed across matched models. Prices must be USD per million tokens. This estimates API-equivalent usage, not actual subscription payments.
- No prices are configured initially. **Unpriced** and **0% coverage** mean that no cost estimate is available; they do not mean zero cost. Partial pricing produces a partial estimate. No price is guessed for model aliases or service tiers.

To enable estimates, create a tracked `usage-rates.json` with exact model IDs and verified prices:

```json
{
  "models": {
    "EXACT_MODEL_ID": { "input": 0, "cached": 0, "output": 0 }
  }
}
```

The zeroes above are schema placeholders; replace all three with verified prices and document the price source/date before using them.

## Local update

Requires Node.js 22 or newer and authenticated Git push access to this repository.

```sh
npm ci --ignore-scripts
npm run usage:preview
# Inspect .local/preview/ai-usage.svg and ai-usage.json.
npm run usage:publish -- --publish
```

Preview runs locally. Publishing explicitly copies the allow-listed aggregates to `assets/`, commits them, and pushes `main`. Keep the worktree clean before publishing. There is no GitHub-hosted scheduled job because GitHub runners cannot read this Mac's Codex logs. The card retains its last snapshot until another local update; its footer shows the collection time.

## Public data boundary

Public files contain period totals, session count, dates, day/hour token aggregates, cache ratio, and pricing coverage. They do not contain prompts, replies, source code, credentials, project names, model IDs, machine names, file paths, or session identifiers. The upstream parser may use these locally for attribution and deduplication. Its derived cache stays in the local tool directory; raw logs are never copied into this repository.

Token logs are self-reported telemetry and may be incomplete. These numbers are useful for personal visibility, not financial settlement or proof of productivity. The README image is a snapshot; GitHub does not run interactive filters inside README images.
