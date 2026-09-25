// A token's web name: `--<group>-<key>`, kebab-cased, with a half step's point
// written as `_` (space 2.5 is `--space-2_5`). The generator and the design
// system test share it, so the two cannot disagree about a name.
export const cssName = (group, key) => `${group}-${String(key).replace('.', '_').replace(/[A-Z]/g, c => '-' + c.toLowerCase())}`;
