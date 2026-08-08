import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";
import type { z } from "zod";

/**
 * Real place and tennis words the English dataset reads as profanity. Without
 * these, courts in towns like Penistone could never be added.
 */
const ALLOWLIST = [
  "penistone",
  "clitheroe",
  "cockburn",
  "cockfosters",
  "lightwater",
  "dickinson",
  "titmus",
  "bassett",
  "cumberland",
  "assumption",
  "mishit",
  "mishits",
];

const dataset = englishDataset.build();

const matcher = new RegExpMatcher({
  blacklistedTerms: dataset.blacklistedTerms,
  whitelistedTerms: [...(dataset.whitelistedTerms ?? []), ...ALLOWLIST],
  ...englishRecommendedTransformers,
});

/**
 * "f u c k" reads as four one-letter words, so the matcher misses it. Rejoining
 * runs of three or more single characters exposes the word. Only those runs are
 * joined — gluing every word together would flag innocent text like
 * "are analysed".
 */
function collapseSpacedLetters(text: string): string {
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  const parts: string[] = [];
  let run: string[] = [];

  const flushRun = () => {
    if (run.length >= 3) parts.push(run.join(""));
    run = [];
  };

  for (const word of words) {
    if (word.length === 1) {
      run.push(word);
      continue;
    }
    flushRun();
    parts.push(word);
  }
  flushRun();

  return parts.join(" ");
}

export function containsProfanity(text: string): boolean {
  if (!text) return false;
  return (
    matcher.hasMatch(text) || matcher.hasMatch(collapseSpacedLetters(text))
  );
}

/**
 * Adds a field-scoped issue when `value` contains profanity, for use inside a
 * Zod `superRefine`.
 */
export function checkClean(
  ctx: z.RefinementCtx,
  field: string,
  label: string,
  value: string | null | undefined,
) {
  if (!value || !containsProfanity(value)) return;

  ctx.addIssue({
    code: "custom",
    path: [field],
    message: `${label} can't contain profanity. Please reword it.`,
  });
}
