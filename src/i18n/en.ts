import { enPlural } from '../../shared/i18n.ts';
import type { Messages } from './ru.ts';

const p = enPlural;

export const en = {
  meta: { name: 'English', short: 'EN', htmlLang: 'en' },

  plural: {
    lines: (n) => p(n, 'line'),
    comments: (n) => p(n, 'comment'),
    files: (n) => p(n, 'file'),
    replies: (n) => p(n, 'reply', 'replies'),
    blockers: (n) => p(n, 'blocker'),
    hours: (n) => p(n, 'hour'),
    days: (n) => p(n, 'day'),
  },

  common: {
    copy: 'Copy',
    copied: 'Copied',
    cancel: 'Cancel',
    untitled: 'Untitled review',
    loading: 'Loading review…',
    discardComment: 'Discard the comment you’re writing?',
    noConnection: 'No connection. Check your network and try again.',
    requestFailed: (status) => `Request failed (${status})`,
  },

  header: {
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    lightTitle: 'Light theme',
    darkTitle: 'Dark theme',
    language: 'Переключить на русский',
  },

  steps: {
    label: 'Steps',
    items: ['Paste & format', 'Comment', 'Share'],
  },

  severity: {
    blocker: { label: 'Blocker', hint: 'Must fix. Wrong result, crash, or leak.' },
    issue: { label: 'Issue', hint: 'Should fix before this is done.' },
    suggestion: { label: 'Suggestion', hint: 'A better way worth learning.' },
    nit: { label: 'Nit', hint: 'Style or taste. Optional.' },
    praise: { label: 'Praise', hint: 'Good call. Keep doing this.' },
  },

  verdict: {
    changes: 'Changes requested',
    approved: 'Approved',
    comment: 'Comments only',
  },

  expiry: {
    options: { '1d': '1 day', '7d': '7 days', '30d': '30 days', never: 'Never' },
    never: 'Never expires',
    expired: 'Expired',
    lessThanHour: 'Expires in less than an hour',
    inHours: (n) => `Expires in ${p(n, 'hour')}`,
    inDays: (n) => `Expires in ${p(n, 'day')}`,
  },

  line: (line, end) => (end > line ? `lines ${line}–${end}` : `line ${line}`),
  lineTitle: (line, end) => (end > line ? `Lines ${line}–${end}` : `Line ${line}`),

  formatter: {
    asPasted: 'As pasted',
    formatting: (name) => `${name} · formatting…`,
    cantParse: (name) => `${name} · couldn’t parse`,
    none: (lang) => `No formatter for ${lang}`,
    parseNote: 'The formatter couldn’t parse this code, so it’s shown as pasted.',
    fileWarn: 'The formatter couldn’t parse this file',
  },

  languages: { text: 'Plain text', bash: 'Shell' },

  code: {
    newReview: 'New review',
    titleLabel: 'Review title',
    language: 'Language',
    languageOfFile: 'Language of this file',
    style: 'Style',
    indent: 'Indent',
    braces: 'Braces',
    attach: 'Attach',
    allman: 'Allman',
    fileName: 'File name',
    original: 'Original',
    loadExample: 'Load example',
    clear: 'Clear',
    uploadZip: 'Upload .zip',
    uploadAny: 'Upload a .zip or files',
    addFile: 'Add file',
    codeAria: 'Code to review',
    originalAria: 'Original code',
    formattedAria: 'Formatted code',
    pastePlaceholder: 'Paste the code you want to review, or drop a .zip of the project here…',
    pasteFilePlaceholder: 'Paste this file’s code…',
    previewMode: 'Preview mode',
    formatted: 'Formatted',
    diff: 'Diff',
    linesChanged: (n) => `${p(n, 'line')} changed`,
    noChanges: 'No changes',
    emptyTitle: 'Formatted code shows up here',
    emptyText:
      'Paste code on the left, or drop a .zip of a whole project. Everything is re-indented and re-spaced, so you review the logic, not the whitespace.',
    nextSingle: 'Next: comment line by line, then share a short link. No sign-up for you or your mentee.',
    nextMulti: (n) => `Next: comment on any of the ${n} files, then share one short link.`,
    nextPublished: 'Comments stay on their lines when the code changes. Update the link afterwards so your mentee sees it.',
    tooLong: (path, max) => `${path} is longer than we can review: up to ${max.toLocaleString('en')} lines per file.`,
    startReview: 'Start review',
    backToReview: 'Back to review',
    formattingProgress: (i, n) => `Formatting ${i} of ${n}…`,
    filesUnparsed: (n) =>
      `${p(n, 'file')} couldn’t be parsed by the formatter and ${n === 1 ? 'is' : 'are'} shown as uploaded.`,
    drop: 'Drop a .zip or files to review',
    removeFileConfirm: (path, n) => `${path} has ${p(n, 'comment')}. Remove the file and its comments?`,
    replaceConfirm: (n, lost) =>
      `Replace the current code with ${p(n, 'file')}?` +
      (lost ? ` ${p(lost, 'comment')} on files that aren’t in the upload will be removed.` : '') +
      ' Comments on files with the same path stay on their lines.',
    nothingToReview: 'Nothing to review in there: no text files after leaving out build folders and binaries.',
    readFailed: 'Could not read the upload',
    filesTitle: (n) => p(n, 'file'),
    addFileAria: 'Add a file',
    commentOnLine: (n) => `Comment on line ${n}`,
    uploadAria: 'Upload a .zip or files',
  },

  import: {
    imported: (n) => `Imported ${p(n, 'file')}`,
    leftOut: (n, details) => `. Left out ${n}: ${details}.`,
    showLeftOut: 'Show what was left out',
    andMore: (n) => `…and ${n} more`,
    dismiss: 'Dismiss',
    reason: {
      'tool-folder': 'build or tool folder',
      system: 'system file',
      binary: 'binary file',
      'too-big': 'larger than 200 KB',
      'not-text': 'not a text file',
      empty: 'empty',
      'too-many-lines': 'more than 5,000 lines',
      'too-many-files': 'over 300 files',
      'size-limit': 'project size limit',
    },
    invalidZip: 'This file isn’t a valid .zip archive.',
    archiveTooBig: 'That archive is larger than 30 MB. Leave out build folders and try again.',
  },

  tree: {
    files: 'Files',
    open: (n) => `${n} open`,
    allFixed: 'All fixed',
    remove: (path) => `Remove ${path}`,
    removeTitle: 'Remove file',
  },

  review: {
    status: { draft: 'Draft', published: 'Published', dirty: 'Unsaved changes' },
    publish: 'Publish',
    updateLink: 'Update link',
    shareLink: 'Share link',
    saving: 'Saving…',
    editCode: 'Edit code',
    codeAria: 'Code under review',
    settingsAria: 'Review settings',
    clickHint: 'Click a line number to comment · Shift-click for a range · right-click a selection for more',
    summary: 'Summary',
    summaryPlaceholder: 'Overall impression and what to fix first…',
    verdict: 'Verdict',
    comments: 'Comments',
    fixedOf: (f, n) => ` · ${f}/${n} fixed`,
    menteeReplies: (n) => `${p(n, 'reply', 'replies')} from your mentee`,
    noComments: 'No comments yet. Click any line number in the code to leave one.',
    jumpAria: 'Jump to comment',
    menteeReplied: 'Your mentee replied',
    shareTitle: 'Share link',
    signedAs: 'Signed as',
    yourName: 'Your name',
    linkExpires: 'Link expires',
    allowResolve: 'Mentee can mark comments as fixed',
    allowReplies: 'Mentee can reply to comments',
    publishReview: 'Publish review',
    showShareLink: 'Show share link',
    fineprint:
      'No accounts. Anyone with the share link can read the review. Only the private edit link can change it.',
    deleteReview: 'Delete review',
    deleteWithReplies: 'This comment has replies. Delete it with the whole thread?',
    tip: ['Tip:', 'saves a comment,', 'cancels. Shift-click a second line number to comment on a range.'],
  },

  contextMenu: {
    suggestChange: 'Suggest a change',
  },

  composer: {
    editPrefix: 'Edit · ',
    severityAria: 'Severity',
    textAria: 'Comment text',
    placeholder: 'What should change, and why? Wrap code in backticks.',
    suggestedCode: 'Suggested code',
    suggestCode: 'Suggest code',
    removeSuggestion: 'Remove suggestion',
    comment: 'Comment',
    save: 'Save',
  },

  card: {
    you: 'You',
    yourMentor: 'Your mentor',
    mentor: 'Mentor',
    mentee: 'Mentee',
    fixedByMentee: 'Fixed by mentee',
    markFixed: 'Mark as fixed',
    fixedUndo: 'Fixed · undo',
    suggestedChange: 'Suggested change',
    aria: (sev, where) => `${sev} comment on ${where}`,
    editAria: (where) => `Edit the comment on ${where}`,
    deleteAria: (where) => `Delete the comment on ${where}`,
    editTitle: 'Edit',
    deleteTitle: 'Delete',
    replyAria: (where) => `Reply to the comment on ${where}`,
    replyMentor: 'Reply to your mentee…',
    replyMentee: 'Reply or ask a question…',
    reply: 'Reply',
  },

  dialog: {
    published: 'Review published',
    updated: 'Link updated',
    share: 'Share this review',
    sameLink: 'Same link as before. Your mentee sees the changes when they reload the page.',
    shareLabel: 'Share link — send this to your mentee',
    copyLink: 'Copy link',
    editLabel: 'Private edit link — keep it to yourself, it’s your only way back in',
    messageLabel: 'Message to paste in Telegram',
    copyMessage: 'Copy message',
    keepEditing: 'Keep editing',
    openMentee: 'Open mentee view',
    close: 'Close',
    message: (title, comments, blockers, allowResolve, url) =>
      `I reviewed ${title ? `“${title}”` : 'your code'}: ${p(comments, 'comment')}` +
      (blockers ? `, ${p(blockers, 'blocker')}` : '') +
      '. ' +
      (blockers ? 'Start with the blockers' : 'Go through them top to bottom') +
      (allowResolve ? ' and tick things off as you fix them.' : '.') +
      `\n${url}`,
  },

  mentor: {
    incompleteTitle: 'This edit link is incomplete',
    incompleteText:
      'The private key at the end of the link is missing. Open the full edit link you got when you published, or view the review as your mentee sees it.',
    invalidTitle: 'This edit link isn’t valid',
    invalidText: 'The key doesn’t match this review. Check that you copied the whole link.',
    expiredTitle: 'This review has expired',
    expiredText: 'Its link expired, so the review was removed.',
    notFoundTitle: 'Review not found',
    wentWrong: 'Something went wrong',
    openMentee: 'Open mentee view',
    startNew: 'Start a new review',
    deleteConfirm: 'Delete this review? The share link stops working for your mentee.',
    deleted: 'Review deleted',
    couldNotPublish: 'Could not publish',
    couldNotReply: 'Could not send the reply',
    couldNotDelete: 'Could not delete the review',
  },

  shared: {
    expiredText: 'The link was set to expire, so the review is gone. Ask your mentor for a new one.',
    notFoundText: 'Check the link, or ask your mentor to send it again.',
    couldNotSave: 'Could not save',
    mentorEdit: 'Mentor: edit review',
    previewNote: 'This is what your mentee sees. Ticks and replies you make here are saved for real.',
    heroMeta: (name, what) => (name ? `${name} reviewed ${what}` : `Review of ${what}`),
    defaultTitle: 'Code review',
    progress: 'Your progress',
    fixedOfN: (f, n) => `${f} / ${n} fixed`,
    fixedAria: 'Fixed comments',
    noteOff: 'Your mentor turned off progress tracking for this review.',
    noteNothing: 'Nothing to fix. Just read the notes.',
    noteDone: 'All done. Tell your mentor it’s ready for another look.',
    noteBlockers: (n) =>
      n === 1 ? '1 blocker is still open. Start there.' : `${n} blockers are still open. Start there.`,
    noteRest: 'Blockers are done. The rest is polish.',
    filterAria: 'Filter comments',
    all: (n) => `All ${n}`,
    open: (n) => `Open ${n}`,
    fixed: (n) => `Fixed ${n}`,
    copyCode: 'Copy code',
    reviewedCodeAria: 'Reviewed code',
    checklistAria: 'Checklist',
    checklist: 'Checklist',
    blockersFirst: 'Blockers first',
    nothingToFix: 'Nothing to fix here.',
    showInCode: (file, where) => `Show ${file} ${where} in the code`,
    showInCodeTitle: 'Show in code',
    legend: 'What the labels mean',
    downloadZip: 'Download .zip',
  },

  list: {
    title: 'Your reviews',
    savedHere: 'Saved in this browser',
    fixedOf: (f, n) => `${f}/${n} fixed`,
    deleted: 'Deleted',
    expired: 'Expired',
    copyLink: 'Copy link',
    removeAria: (title) => `Remove “${title}” from this list`,
    removeTitle: 'Remove from list',
    forgetConfirm:
      'Remove this review from the list? It stays online, but you’ll need its edit link to change it again.',
  },

  notFound: {
    title: 'Page not found',
    text: 'There’s nothing at this address.',
  },
} satisfies Messages;
