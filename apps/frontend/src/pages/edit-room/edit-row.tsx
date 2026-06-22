import { useState } from 'react';

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconButton({
  onClick,
  title,
  disabled,
  children
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => { setHovered(true); }}
      onMouseLeave={() => { setHovered(false); }}
      className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--border-medium)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: hovered ? 'var(--accent-dim)' : 'transparent',
        color: 'var(--text-secondary)'
      }}
    >
      {children}
    </button>
  );
}

export function EditRow({
  label,
  isEditing,
  displayValue,
  canEdit,
  saving,
  onEdit,
  onSave,
  onCancel,
  children
}: {
  label: string;
  isEditing: boolean;
  displayValue: string;
  canEdit: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  const mutedDisplay =
    displayValue === 'No description' ||
    displayValue === 'Not set' ||
    displayValue === 'No file uploaded' ||
    displayValue === 'No movie set';

  return (
    <div
      className="rounded-xl border p-4 transition-colors"
      style={{
        borderColor: isEditing ? 'var(--accent)' : 'var(--border-subtle)',
        background: isEditing ? 'var(--accent-dim)' : 'var(--bg-primary)'
      }}
    >
      <div className={`flex gap-3 ${isEditing ? 'items-start' : 'items-center'} justify-between`}>
        <div className="min-w-0 flex-1">
          <p className="m-0 mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {label}
          </p>
          {isEditing ? (
            <div className="mt-2">{children}</div>
          ) : (
            <p
              className="m-0 truncate text-sm"
              style={{ color: mutedDisplay ? 'var(--text-muted)' : 'var(--text-primary)' }}
            >
              {displayValue}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-1.5">
            {isEditing ? (
              <>
                <IconButton onClick={onSave} title="Save" disabled={saving}>
                  <CheckIcon />
                </IconButton>
                <IconButton onClick={onCancel} title="Cancel" disabled={saving}>
                  <XIcon />
                </IconButton>
              </>
            ) : (
              <IconButton onClick={onEdit} title={`Edit ${label}`}>
                <PencilIcon />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
      <p className="m-0 mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="m-0 truncate text-sm text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
