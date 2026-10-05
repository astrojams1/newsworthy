# Prompt update ledger

Every rating-prompt version made with the
[prompt update skill](../../.agents/skills/newsworthy-prompt-update/SKILL.md),
newest last, with a link to its full record in this folder. Entries are
append-only: a later version that overturns an earlier one's conclusion says
so in its own record. Read the newest rows and the Lessons before writing the
next version; add a row when a version is published. Versions before v12 have
no record file; their history is in `AGENTS.md`.

| Version | Published | PR | Change | Record |
|---|---|---|---|---|
| v12 | 2026-09-20 | | Sentence writing: one development, at most 150 characters | [v12](v12.md) |
| v13 | 2026-09-20 | #110 | 140-character budget, chosen by the owner | [v13](v13.md) |
| v14 | 2026-09-22 | | Development age within the 140 characters | [v14](v14.md) |
| v15 | 2026-09-24 | #136 | Calm, plain sentence for a non-expert reader | [v15](v15.md) |
| v16 | 2026-09-24 | #137 | 135-character body now the only prefix is "New: " | [v16](v16.md) |
| v17 | 2026-09-24 | #138 | House style, so two readings read alike | [v17](v17.md) |
| v18 | 2026-09-27 | #161 | The score is market risk: a new instrument | [v18](v18.md) |
| v19 | 2026-09-27 | #166 | The sentence never names a news outlet | [v19](v19.md) |
| v20 | 2026-09-29 | #190 | Search the themes markets are trading on | [v20](v20.md) |
| v21 | 2026-10-05 | | The sentence never predicts a market move | [v21](v21.md) |

## Lessons

What earlier versions cost to learn; each is told in full in `AGENTS.md`.

- **A prompt change is not evaluable until its readings are verified**
  (2026-08). Five wordings of one prohibition (v2, v5, v10 and others) were
  judged on readings nobody could attribute to the text; `prompt_sha256` now
  proves which text a reading ran.
- **Prose about a scale does not move a scale** (v8). Change the rungs.
- **A caller can run a version retired hours ago** (2026-08-29). Rule out a
  stale copy before concluding a change had no effect.
- **v10 and v11 rest on evidence that did not survive** (2026-08). Both
  theories were built on readings produced from v9's text; they are not a
  basis for the next version.
- **An Output phrase is an instruction, not a hint** (v21, 2026-10-05). v18's
  "what it could mean for prices or savings" turned a forecast tail from 0% of
  sentences into 76%; removing it took fixture forecasts from 9 of 16 to 0.
