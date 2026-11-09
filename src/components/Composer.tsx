import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { SEVERITIES, type Severity } from '../../shared/types.ts';
import { lineLabel, SEVERITY } from '../lib/text.ts';
import { Icon } from './Icon.tsx';

export interface ComposerValue {
  severity: Severity;
  text: string;
  suggestion: string;
}

export function Composer({
  line,
  endLine,
  editing,
  initial,
  rangeCode,
  onSave,
  onCancel,
  onChange,
}: {
  line: number;
  endLine: number;
  editing: boolean;
  initial: ComposerValue;
  /** The code on the commented lines, to prefill "Suggest code". */
  rangeCode: string;
  onSave: (v: ComposerValue) => void;
  onCancel: () => void;
  /** Reports whether there is text, so an empty composer can be toggled shut. */
  onChange?: (hasText: boolean) => void;
}) {
  const [severity, setSeverity] = useState<Severity>(initial.severity);
  const [text, setText] = useState(initial.text);
  const [suggestion, setSuggestion] = useState(initial.suggestion);
  const [showSug, setShowSug] = useState(!!initial.suggestion);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textRef.current?.focus({ preventScroll: true });
    textRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);
  useEffect(() => onChange?.(!!text.trim()), [text, onChange]);

  const canSave = !!text.trim();
  const saved = useRef(false);
  const save = () => {
    if (!canSave || saved.current) return;
    saved.current = true;
    onSave({
      severity,
      text: text.trim(),
      suggestion: showSug ? suggestion.replace(/\s+$/, '') : '',
    });
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };
  const onSugKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const el = e.currentTarget;
      el.setRangeText('  ', el.selectionStart, el.selectionEnd, 'end');
      setSuggestion(el.value);
    }
    // Cmd+Enter and Esc bubble up to the composer's own handler.
  };

  return (
    <div className="np-composer" onKeyDown={onKey}>
      <div className="np-composer__head">
        <span className="np-label">
          {editing ? 'Edit · ' : ''}
          {lineLabel(line, endLine).replace(/^l/, 'L')}
        </span>
        <div role="radiogroup" aria-label="Severity" className="sev-group">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={severity === s}
              className={`np-sev np-sev--${s}`}
              onClick={() => setSeverity(s)}
            >
              <span className="np-dot" />
              {SEVERITY[s].label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        ref={textRef}
        className="np-composer__text"
        aria-label="Comment text"
        value={text}
        maxLength={5000}
        onChange={(e) => setText(e.target.value)}
        placeholder="What should change, and why? Wrap code in backticks."
      />
      {showSug && (
        <div className="composer-sug">
          <div className="composer-sug__head">
            <Icon name="code" size={14} />
            Suggested code
          </div>
          <textarea
            className="np-textarea np-textarea--code composer-sug__text"
            aria-label="Suggested code"
            spellCheck={false}
            value={suggestion}
            rows={Math.min(14, Math.max(3, suggestion.split('\n').length + 1))}
            onChange={(e) => setSuggestion(e.target.value)}
            onKeyDown={onSugKey}
          />
        </div>
      )}
      <div className="np-composer__foot">
        <button
          type="button"
          className="np-btn np-btn--ghost"
          onClick={() => {
            if (!showSug && !suggestion) setSuggestion(rangeCode);
            setShowSug(!showSug);
          }}
        >
          <Icon name="code" />
          {showSug ? 'Remove suggestion' : 'Suggest code'}
        </button>
        <div className="composer-actions">
          <span className="kbd-hint" aria-hidden="true">
            ⌘↵
          </span>
          <button type="button" className="np-btn np-btn--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="np-btn np-btn--primary"
            disabled={!canSave}
            onClick={save}
          >
            {editing ? 'Save' : 'Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
