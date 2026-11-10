// Locales and the server's own messages: API errors and link previews.
// The UI's strings live in src/i18n.

export const LOCALES = ['ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ru';

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v);
}

/** Picks a locale from an explicit value or an Accept-Language header. */
export function pickLocale(explicit?: string | null, acceptLanguage?: string | null): Locale {
  if (isLocale(explicit)) return explicit;
  if (acceptLanguage) {
    for (const part of acceptLanguage.split(',')) {
      const tag = part.trim().slice(0, 2).toLowerCase();
      if (tag === 'ru' || tag === 'uk' || tag === 'be' || tag === 'kk') return 'ru';
      if (tag === 'en') return 'en';
    }
  }
  return DEFAULT_LOCALE;
}

/** Russian plural: 1 файл, 2 файла, 5 файлов. */
export function ruPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  const word =
    m10 === 1 && m100 !== 11
      ? one
      : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)
        ? few
        : many;
  return `${n} ${word}`;
}

export const enPlural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

export type Field =
  | 'title' | 'language' | 'path' | 'code' | 'original' | 'formatter' | 'summary'
  | 'verdict' | 'name' | 'expiry' | 'severity' | 'comment' | 'suggestion' | 'reply'
  | 'line' | 'endLine' | 'locale';

const ru = {
  field: {
    title: 'Название', language: 'Язык', path: 'Путь файла', code: 'Код',
    original: 'Исходный код', formatter: 'Форматтер', summary: 'Итог', verdict: 'Вердикт',
    name: 'Имя', expiry: 'Срок ссылки', severity: 'Важность', comment: 'Комментарий',
    suggestion: 'Предложенный код', reply: 'Ответ', line: 'Строка комментария',
    endLine: 'Последняя строка комментария', locale: 'Язык интерфейса',
  } satisfies Record<Field, string>,
  notText: (f: string) => `${f}: ожидается текст`,
  tooLong: (f: string, max: number) => `${f}: слишком длинно (максимум ${max} символов)`,
  required: (f: string) => `${f}: обязательное поле`,
  oneOf: (f: string, list: string) => `${f}: допустимо одно из значений ${list}`,
  wholeNumber: (f: string, min: number, max: number) => `${f}: целое число от ${min} до ${max}`,
  expectedObject: 'Ожидался JSON-объект',
  noFiles: 'Добавьте хотя бы один файл',
  tooManyFiles: (max: number) => `Слишком много файлов (максимум ${max})`,
  fileMalformed: (i: number) => `Файл ${i} записан с ошибкой`,
  badPath: (p: string) => `Недопустимый путь файла: ${p}`,
  dupPath: (p: string) => `Файл встречается дважды: ${p}`,
  fileTooLong: (p: string, max: number) => `${p} слишком длинный (максимум ${max} строк)`,
  projectTooLarge: 'Проект слишком большой, чтобы проверить его за один раз',
  noCode: 'Здесь нет кода для ревью',
  commentsList: 'comments должен быть списком',
  tooManyComments: (max: number) => `Слишком много комментариев (максимум ${max})`,
  commentMalformed: (i: number) => `Комментарий ${i} записан с ошибкой`,
  badCommentId: (i: number) => `У комментария ${i} неверный id`,
  commentFileMissing: (i: number) => `Комментарий ${i} относится к файлу, которого нет в ревью`,

  notFound: 'Ревью не найдено',
  expired: 'Срок действия ревью истёк',
  tooManyReviews: 'Слишком много ревью с вашего адреса. Попробуйте позже.',
  tooManyAttempts: 'Слишком много попыток',
  badEditKey: 'Ссылка для редактирования недействительна',
  slowDown: 'Помедленнее, пожалуйста',
  resolveOff: 'В этом ревью отметки об исправлении выключены',
  repliesOff: 'В этом ревью ответы выключены',
  commentNotFound: 'Комментарий не найден',
  threadFull: 'В этой ветке больше нет места',
  tooLarge: 'Запрос слишком большой',
  malformedJson: 'Неверный JSON',
  serverError: 'Что-то сломалось на нашей стороне',
  apiNotFound: 'Не найдено',

  verdict: { changes: 'Нужны правки', approved: 'Одобрено', comment: 'Только комментарии' },
  comments: (n: number) => ruPlural(n, 'комментарий', 'комментария', 'комментариев'),
  blockers: (n: number) => ruPlural(n, 'блокер', 'блокера', 'блокеров'),
  files: (n: number) => ruPlural(n, 'файл', 'файла', 'файлов'),
  reviewOf: (what: string, by: string) => `Ревью ${what}${by ? ` от ${by}` : ''}`,
  defaultTitle: 'Код-ревью',
};

export type ServerMessages = typeof ru;

const en: ServerMessages = {
  field: {
    title: 'Title', language: 'Language', path: 'File path', code: 'Code',
    original: 'Original code', formatter: 'Formatter', summary: 'Summary', verdict: 'Verdict',
    name: 'Name', expiry: 'Expiry', severity: 'Severity', comment: 'Comment',
    suggestion: 'Suggestion', reply: 'Reply', line: 'Comment line',
    endLine: 'Comment end line', locale: 'Locale',
  },
  notText: (f) => `${f} must be text`,
  tooLong: (f, max) => `${f} is too long (max ${max} characters)`,
  required: (f) => `${f} is required`,
  oneOf: (f, list) => `${f} must be one of ${list}`,
  wholeNumber: (f, min, max) => `${f} must be a whole number ${min}–${max}`,
  expectedObject: 'Expected a JSON object',
  noFiles: 'Add at least one file',
  tooManyFiles: (max) => `Too many files (max ${max})`,
  fileMalformed: (i) => `File ${i} is malformed`,
  badPath: (p) => `Bad file path: ${p}`,
  dupPath: (p) => `Duplicate file: ${p}`,
  fileTooLong: (p, max) => `${p} is too long (max ${max} lines)`,
  projectTooLarge: 'The project is too large to review in one go',
  noCode: 'There is no code to review',
  commentsList: 'comments must be a list',
  tooManyComments: (max) => `Too many comments (max ${max})`,
  commentMalformed: (i) => `Comment ${i} is malformed`,
  badCommentId: (i) => `Comment ${i} has a bad id`,
  commentFileMissing: (i) => `Comment ${i} is on a file that isn’t in the review`,

  notFound: 'Review not found',
  expired: 'This review has expired',
  tooManyReviews: 'Too many reviews from you. Try again later.',
  tooManyAttempts: 'Too many attempts',
  badEditKey: 'This edit link is not valid',
  slowDown: 'Slow down a little',
  resolveOff: 'Progress tracking is off for this review',
  repliesOff: 'Replies are off for this review',
  commentNotFound: 'Comment not found',
  threadFull: 'This thread is full',
  tooLarge: 'Request is too large',
  malformedJson: 'Malformed JSON',
  serverError: 'Something went wrong on our side',
  apiNotFound: 'Not found',

  verdict: { changes: 'Changes requested', approved: 'Approved', comment: 'Comments only' },
  comments: (n) => enPlural(n, 'comment'),
  blockers: (n) => enPlural(n, 'blocker'),
  files: (n) => enPlural(n, 'file'),
  reviewOf: (what, by) => `Review of ${what}${by ? ` by ${by}` : ''}`,
  defaultTitle: 'Code review',
};

export const SERVER_MESSAGES: Record<Locale, ServerMessages> = { ru, en };
