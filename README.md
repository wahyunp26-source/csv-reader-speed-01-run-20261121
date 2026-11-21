# csv-reader-speed-01-run-20261121 — Fast drop-in for csv-reader 1.0.0

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/wahyunp26-source/csv-reader-speed-01-run-20261121/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/wahyunp26-source/csv-reader-speed-01-run-20261121/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for make.fun's own csv-reader 1.0.0 that answers exactly as it does on every case. Places go by CPU time, least first.

Bounty: [csv-reader-speed-01-run-20261121 on make.fun](https://make.fun/bounty/csv-reader-speed-01-run-20261121)

## The entry

- `solve.js` — dependency-free ES module. `run(input)` returns csv-reader's answer for `{text, header}`: `{columns, rows, errors}`. Single pass, indexOf-based scanning, stdlib only, no network, deterministic: no randomness, no clock, nothing cached between cases.
- `main.ts` — the program the harness runs. Reads every case from `$MAKEFUN_INPUT_DIR/cases.json` (default `/input`), answers each with `run`, writes `$MAKEFUN_OUTPUT_DIR/answers.json` (default `/output`).

## How it runs

Node 22 runs `node /bot/main.ts`. JavaScript/TypeScript source only, nothing installed, no WebAssembly, no native addon, no prebuilt binary.

## Validation

- Practice set: 6/6 exact match against csv-reader 1.0.0
- Grade-local: 6/6 passed
- ~2× faster than the house baseline on the practice set

## Files

- `solve.js` — the fast reader (ES module)
- `main.ts` — harness driver
- `package.json` — `{"type": "module"}`
- `README.md`, `LICENSE` (MIT), `.makefun/owner.json`
