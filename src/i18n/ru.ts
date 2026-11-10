// Russian is the source language. en.ts must have the same shape (checked by
// TypeScript via `satisfies Messages`).

import { ruPlural } from '../../shared/i18n.ts';

const p = ruPlural;

export const ru = {
  meta: { name: 'Русский', short: 'RU', htmlLang: 'ru' },

  plural: {
    lines: (n: number) => p(n, 'строка', 'строки', 'строк'),
    comments: (n: number) => p(n, 'комментарий', 'комментария', 'комментариев'),
    files: (n: number) => p(n, 'файл', 'файла', 'файлов'),
    replies: (n: number) => p(n, 'ответ', 'ответа', 'ответов'),
    blockers: (n: number) => p(n, 'блокер', 'блокера', 'блокеров'),
    hours: (n: number) => p(n, 'час', 'часа', 'часов'),
    days: (n: number) => p(n, 'день', 'дня', 'дней'),
  },

  common: {
    copy: 'Копировать',
    copied: 'Скопировано',
    cancel: 'Отмена',
    untitled: 'Ревью без названия',
    loading: 'Загружаем ревью…',
    discardComment: 'Удалить комментарий, который вы пишете?',
    noConnection: 'Нет соединения. Проверьте сеть и попробуйте ещё раз.',
    requestFailed: (status: number) => `Запрос не удался (${status})`,
  },

  header: {
    toLight: 'Включить светлую тему',
    toDark: 'Включить тёмную тему',
    lightTitle: 'Светлая тема',
    darkTitle: 'Тёмная тема',
    language: 'Switch to English',
  },

  steps: {
    label: 'Шаги',
    items: ['Код', 'Комментарии', 'Ссылка'],
  },

  severity: {
    blocker: { label: 'Блокер', hint: 'Исправить обязательно: неверный результат, падение или утечка.' },
    issue: { label: 'Проблема', hint: 'Стоит исправить до сдачи.' },
    suggestion: { label: 'Совет', hint: 'Способ получше, который стоит знать.' },
    nit: { label: 'Мелочь', hint: 'Стиль или вкус. Необязательно.' },
    praise: { label: 'Похвала', hint: 'Хорошее решение. Так держать.' },
  },

  verdict: {
    changes: 'Нужны правки',
    approved: 'Одобрено',
    comment: 'Только комментарии',
  },

  expiry: {
    options: { '1d': '1 день', '7d': '7 дней', '30d': '30 дней', never: 'Никогда' },
    never: 'Бессрочно',
    expired: 'Срок истёк',
    lessThanHour: 'Истекает меньше чем через час',
    inHours: (n: number) => `Истекает через ${p(n, 'час', 'часа', 'часов')}`,
    inDays: (n: number) => `Истекает через ${p(n, 'день', 'дня', 'дней')}`,
  },

  line: (line: number, end: number) => (end > line ? `строки ${line}–${end}` : `строка ${line}`),
  lineTitle: (line: number, end: number) =>
    end > line ? `Строки ${line}–${end}` : `Строка ${line}`,

  formatter: {
    asPasted: 'Как есть',
    formatting: (name: string) => `${name} · форматируем…`,
    cantParse: (name: string) => `${name} · не удалось разобрать`,
    none: (lang: string) => `Для ${lang} нет форматтера`,
    parseNote: 'Форматтер не смог разобрать этот код, поэтому он показан как есть.',
    fileWarn: 'Форматтер не смог разобрать этот файл',
  },

  languages: { text: 'Обычный текст', bash: 'Shell' } as Record<string, string>,

  code: {
    newReview: 'Новое ревью',
    titleLabel: 'Название ревью',
    language: 'Язык',
    languageOfFile: 'Язык этого файла',
    style: 'Стиль',
    indent: 'Отступ',
    braces: 'Скобки',
    attach: 'В строке',
    allman: 'С новой строки',
    fileName: 'Имя файла',
    original: 'Исходник',
    loadExample: 'Пример',
    clear: 'Очистить',
    uploadZip: 'Загрузить .zip',
    uploadAny: 'Загрузить .zip или файлы',
    addFile: 'Добавить файл',
    codeAria: 'Код для ревью',
    originalAria: 'Исходный код',
    formattedAria: 'Отформатированный код',
    pastePlaceholder: 'Вставьте код для ревью или перетащите сюда .zip проекта…',
    pasteFilePlaceholder: 'Вставьте код этого файла…',
    previewMode: 'Режим просмотра',
    formatted: 'Форматированный',
    diff: 'Разница',
    linesChanged: (n: number) => `${p(n, 'строка изменена', 'строки изменены', 'строк изменено')}`,
    noChanges: 'Без изменений',
    emptyTitle: 'Здесь появится отформатированный код',
    emptyText:
      'Вставьте код слева или перетащите .zip всего проекта. Отступы и пробелы выравниваются автоматически, так что вы смотрите на логику, а не на форматирование.',
    nextSingle: 'Дальше: комментарии по строкам, потом короткая ссылка. Регистрация не нужна ни вам, ни ученику.',
    nextMulti: (n: number) => `Дальше: комментарии к любому из ${p(n, 'файла', 'файлов', 'файлов')}, потом одна короткая ссылка.`,
    nextPublished: 'Комментарии останутся на своих строках, даже если код поменяется. После правок обновите ссылку, чтобы ученик их увидел.',
    tooLong: (path: string, max: number) => `${path} слишком длинный для ревью: не больше ${max.toLocaleString('ru')} строк в файле.`,
    startReview: 'Начать ревью',
    backToReview: 'Вернуться к ревью',
    formattingProgress: (i: number, n: number) => `Форматируем ${i} из ${n}…`,
    filesUnparsed: (n: number) =>
      `${p(n, 'файл', 'файла', 'файлов')} не удалось разобрать форматтером — ${n === 1 ? 'он показан' : 'они показаны'} как есть.`,
    drop: 'Перетащите .zip или файлы для ревью',
    removeFileConfirm: (path: string, n: number) =>
      `В ${path} ${p(n, 'комментарий', 'комментария', 'комментариев')}. Удалить файл вместе с ними?`,
    replaceConfirm: (n: number, lost: number) =>
      `Заменить текущий код на ${p(n, 'файл', 'файла', 'файлов')}?` +
      (lost ? ` ${p(lost, 'комментарий', 'комментария', 'комментариев')} к файлам, которых нет в загрузке, удалятся.` : '') +
      ' Комментарии к файлам с тем же путём останутся на своих строках.',
    nothingToReview: 'Тут нечего ревьюить: после отсева папок сборки и бинарников не осталось текстовых файлов.',
    readFailed: 'Не удалось прочитать загрузку',
    filesTitle: (n: number) => p(n, 'файл', 'файла', 'файлов'),
    addFileAria: 'Добавить файл',
    commentOnLine: (n: number) => `Прокомментировать строку ${n}`,
    uploadAria: 'Загрузить .zip или файлы',
  },

  import: {
    imported: (n: number) => `Импортировано: ${p(n, 'файл', 'файла', 'файлов')}`,
    leftOut: (n: number, details: string) => `. Пропущено ${n}: ${details}.`,
    showLeftOut: 'Показать пропущенное',
    andMore: (n: number) => `…и ещё ${n}`,
    dismiss: 'Скрыть',
    reason: {
      'tool-folder': 'папка сборки или инструментов',
      system: 'системный файл',
      binary: 'бинарный файл',
      'too-big': 'больше 200 КБ',
      'not-text': 'не текст',
      empty: 'пустой',
      'too-many-lines': 'больше 5000 строк',
      'too-many-files': 'больше 300 файлов',
      'size-limit': 'превышен размер проекта',
    },
    invalidZip: 'Это не похоже на .zip-архив.',
    archiveTooBig: 'Архив больше 30 МБ. Уберите папки сборки и попробуйте снова.',
  },

  tree: {
    files: 'Файлы',
    open: (n: number) => `открыто: ${n}`,
    allFixed: 'Всё исправлено',
    remove: (path: string) => `Убрать ${path}`,
    removeTitle: 'Убрать файл',
  },

  review: {
    status: { draft: 'Черновик', published: 'Опубликовано', dirty: 'Есть изменения' },
    publish: 'Опубликовать',
    updateLink: 'Обновить ссылку',
    shareLink: 'Ссылка',
    saving: 'Сохраняем…',
    editCode: 'Изменить код',
    codeAria: 'Код на ревью',
    settingsAria: 'Настройки ревью',
    clickHint: 'Номер строки — комментарий · Shift — диапазон · правый клик по выделению — меню',
    summary: 'Итог',
    summaryPlaceholder: 'Общее впечатление и что исправить в первую очередь…',
    verdict: 'Вердикт',
    comments: 'Комментарии',
    fixedOf: (f: number, n: number) => ` · исправлено ${f}/${n}`,
    menteeReplies: (n: number) => `${p(n, 'ответ', 'ответа', 'ответов')} от ученика`,
    noComments: 'Комментариев пока нет. Нажмите на номер любой строки, чтобы оставить первый.',
    jumpAria: 'Перейти к комментарию',
    menteeReplied: 'Ученик ответил',
    shareTitle: 'Ссылка для ученика',
    signedAs: 'Подпись',
    yourName: 'Ваше имя',
    linkExpires: 'Ссылка действует',
    allowResolve: 'Ученик может отмечать исправленное',
    allowReplies: 'Ученик может отвечать на комментарии',
    publishReview: 'Опубликовать ревью',
    showShareLink: 'Показать ссылку',
    fineprint:
      'Без аккаунтов. Ревью может прочитать любой, у кого есть ссылка. Изменить его можно только по приватной ссылке для редактирования.',
    deleteReview: 'Удалить ревью',
    deleteWithReplies: 'У комментария есть ответы. Удалить его вместе с веткой?',
    tip: ['Подсказка:', 'сохраняет комментарий,', 'отменяет. Shift и клик по второй строке — комментарий к диапазону.'],
  },

  contextMenu: {
    suggestChange: 'Предложить правку',
  },

  composer: {
    editPrefix: 'Правка · ',
    severityAria: 'Важность',
    textAria: 'Текст комментария',
    placeholder: 'Что поменять и почему? Код оборачивайте в `обратные кавычки`.',
    suggestedCode: 'Предложенный код',
    suggestCode: 'Предложить код',
    removeSuggestion: 'Убрать предложение',
    comment: 'Оставить',
    save: 'Сохранить',
  },

  card: {
    you: 'Вы',
    yourMentor: 'Ваш ментор',
    mentor: 'Ментор',
    mentee: 'Ученик',
    fixedByMentee: 'Исправлено учеником',
    markFixed: 'Отметить исправленным',
    fixedUndo: 'Исправлено · отменить',
    suggestedChange: 'Предлагаемая правка',
    aria: (sev: string, where: string) => `${sev}: комментарий, ${where}`,
    editAria: (where: string) => `Изменить комментарий, ${where}`,
    deleteAria: (where: string) => `Удалить комментарий, ${where}`,
    editTitle: 'Изменить',
    deleteTitle: 'Удалить',
    replyAria: (where: string) => `Ответить на комментарий, ${where}`,
    replyMentor: 'Ответить ученику…',
    replyMentee: 'Ответить или задать вопрос…',
    reply: 'Ответить',
  },

  dialog: {
    published: 'Ревью опубликовано',
    updated: 'Ссылка обновлена',
    share: 'Поделиться ревью',
    sameLink: 'Ссылка та же. Ученик увидит изменения, когда обновит страницу.',
    shareLabel: 'Ссылка для ученика — отправьте её',
    copyLink: 'Копировать ссылку',
    editLabel: 'Приватная ссылка для редактирования — только для вас, другого способа вернуться нет',
    messageLabel: 'Сообщение для Telegram',
    copyMessage: 'Копировать сообщение',
    keepEditing: 'Продолжить редактирование',
    openMentee: 'Открыть как ученик',
    close: 'Закрыть',
    message: (title: string, comments: number, blockers: number, allowResolve: boolean, url: string) =>
      `Ревью ${title ? `«${title}»` : 'твоего кода'} готово: ${p(comments, 'комментарий', 'комментария', 'комментариев')}` +
      (blockers ? `, из них ${p(blockers, 'блокер', 'блокера', 'блокеров')}` : '') +
      '. ' +
      (blockers ? 'Начни с блокеров' : 'Пройдись по ним сверху вниз') +
      (allowResolve ? ' и отмечай исправленное.' : '.') +
      `\n${url}`,
  },

  mentor: {
    incompleteTitle: 'Ссылка для редактирования неполная',
    incompleteText:
      'В конце ссылки не хватает приватного ключа. Откройте полную ссылку, которую получили при публикации, или посмотрите ревью глазами ученика.',
    invalidTitle: 'Ссылка для редактирования не подходит',
    invalidText: 'Ключ не совпадает с этим ревью. Проверьте, что скопировали ссылку целиком.',
    expiredTitle: 'Срок ревью истёк',
    expiredText: 'Срок действия ссылки закончился, и ревью удалено.',
    notFoundTitle: 'Ревью не найдено',
    wentWrong: 'Что-то пошло не так',
    openMentee: 'Открыть как ученик',
    startNew: 'Начать новое ревью',
    deleteConfirm: 'Удалить ревью? Ссылка у ученика перестанет работать.',
    deleted: 'Ревью удалено',
    couldNotPublish: 'Не удалось опубликовать',
    couldNotReply: 'Не удалось отправить ответ',
    couldNotDelete: 'Не удалось удалить ревью',
  },

  shared: {
    expiredText: 'У ссылки был срок действия, и ревью больше нет. Попросите ментора прислать новое.',
    notFoundText: 'Проверьте ссылку или попросите ментора отправить её ещё раз.',
    couldNotSave: 'Не удалось сохранить',
    mentorEdit: 'Ментор: изменить ревью',
    previewNote: 'Так ревью видит ученик. Отметки и ответы, сделанные здесь, сохраняются по-настоящему.',
    heroMeta: (name: string, what: string) => (name ? `Ревью от ${name}: ${what}` : `Ревью: ${what}`),
    defaultTitle: 'Код-ревью',
    progress: 'Ваш прогресс',
    fixedOfN: (f: number, n: number) => `${f} / ${n} исправлено`,
    fixedAria: 'Исправленные комментарии',
    noteOff: 'Ментор выключил отметки прогресса в этом ревью.',
    noteNothing: 'Исправлять нечего. Просто прочитайте заметки.',
    noteDone: 'Всё готово. Напишите ментору, что можно посмотреть ещё раз.',
    noteBlockers: (n: number) =>
      n === 1 ? 'Остался 1 блокер. Начните с него.' : `Осталось ${p(n, 'блокер', 'блокера', 'блокеров')}. Начните с них.`,
    noteRest: 'Блокеры закрыты. Остальное — шлифовка.',
    filterAria: 'Фильтр комментариев',
    all: (n: number) => `Все ${n}`,
    open: (n: number) => `Открытые ${n}`,
    fixed: (n: number) => `Исправленные ${n}`,
    copyCode: 'Копировать код',
    reviewedCodeAria: 'Код с комментариями',
    checklistAria: 'Чеклист',
    checklist: 'Чеклист',
    blockersFirst: 'Сначала блокеры',
    nothingToFix: 'Здесь нечего исправлять.',
    showInCode: (file: string, where: string) => `Показать ${file}, ${where}`,
    showInCodeTitle: 'Показать в коде',
    legend: 'Что значат метки',
    downloadZip: 'Скачать .zip',
  },

  list: {
    title: 'Ваши ревью',
    savedHere: 'Хранятся в этом браузере',
    fixedOf: (f: number, n: number) => `исправлено ${f}/${n}`,
    deleted: 'Удалено',
    expired: 'Срок истёк',
    copyLink: 'Копировать ссылку',
    removeAria: (title: string) => `Убрать «${title}» из списка`,
    removeTitle: 'Убрать из списка',
    forgetConfirm:
      'Убрать ревью из списка? Оно останется доступно, но изменить его можно будет только по ссылке для редактирования.',
  },

  notFound: {
    title: 'Страница не найдена',
    text: 'По этому адресу ничего нет.',
  },
};

export type Messages = typeof ru;
