export const TRANSLOCO_LANGUAGES = ['en', 'de'] as const;
export type TranslocoLanguage = typeof TRANSLOCO_LANGUAGES[number];

/** English first: the demo audience is UZH's international staff and students as much as German speakers. */
export const DEFAULT_LANGUAGE: TranslocoLanguage = 'en';
