import type { Locale } from "./dictionaries";

// Resolves one field of a DB row to its locale-specific override, falling
// back to the English base column whenever no override exists yet (locale
// is "en", the translations blob is empty, or this particular field hasn't
// been translated). `translations` is a jsonb column shaped
// `{ fr?: Partial<Row>, es?: Partial<Row> }` — see migration 0020. Array
// fields (spec, marketing_paragraphs, features, applications,
// required_accessories) are overridden as a whole array, not merged
// element-by-element, since their rows are positionally paired with the
// English version.
export function localize<T>(
  base: T,
  translations: unknown,
  locale: Locale,
  field: string,
): T {
  if (locale === "en") return base;
  const block = (translations as Record<string, Record<string, unknown>> | null | undefined)?.[locale];
  const override = block?.[field];
  return override === undefined || override === null ? base : (override as T);
}
