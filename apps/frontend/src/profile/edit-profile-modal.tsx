import { useState } from 'react';
import { Link } from 'react-router-dom';

import { API_BASE_URL } from '@repo/consts/api';
import { patchAuthMeContract } from '@repo/contracts/profile';
import type { UserProfile } from '@repo/schemas/profile';

import { PresetAvatar } from '@/components/preset-avatar';
import {
  AVATAR_PRESETS,
  DEFAULT_AVATAR_PRESET_ID,
  isAvatarPresetId,
  type AvatarPresetId
} from '@/data/avatar-presets';
import { rememberFirstNameFromRegistration } from '@/auth/profile-local';

export interface EditProfileModalProps {
  readonly user: UserProfile;
  readonly onClose: () => void;
  readonly onSaved: (user: UserProfile) => void;
}

const PRIVACY_NOTICE =
  'When your profile is private, others can still see your display name, @username, and member since. Friends, watch history, achievements, and stats are hidden.';

export function EditProfileModal({ user, onClose, onSaved }: EditProfileModalProps) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber);
  const [isProfilePrivate, setIsProfilePrivate] = useState(user.isProfilePrivate);
  const [avatarId, setAvatarId] = useState<AvatarPresetId>(
    isAvatarPresetId(user.avatarId) ? user.avatarId : DEFAULT_AVATAR_PRESET_ID
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const body = patchAuthMeContract.bodySchema.parse({
        firstName,
        lastName,
        phoneNumber,
        isProfilePrivate,
        avatarId
      });
      const response = await fetch(`${API_BASE_URL}${patchAuthMeContract.path}`, {
        method: patchAuthMeContract.method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const raw: unknown = await response.json().catch(() => null);
        const message =
          typeof raw === 'object' &&
          raw !== null &&
          'detail' in raw &&
          typeof raw.detail === 'string'
            ? raw.detail
            : `Could not save profile (HTTP ${String(response.status)})`;
        setError(message);
        return;
      }
      const updated = patchAuthMeContract.responseSchema.parse(await response.json());
      rememberFirstNameFromRegistration(updated.firstName, updated.email);
      onSaved(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        className="card fade-up soft-scroll"
        style={{ maxWidth: 480, width: '100%', padding: 24, maxHeight: 'min(90dvh, 640px)', overflowY: 'auto' }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
      >
        <h2
          id="edit-profile-title"
          className="display"
          style={{ margin: '0 0 16px', fontSize: 20, color: 'var(--text-primary)' }}
        >
          Edit profile
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Username (read-only)
            </label>
            <input className="input" value={user.userName} readOnly disabled />
          </div>
          <div>
            <label className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Email (read-only)
            </label>
            <input className="input" value={user.email} readOnly disabled />
          </div>
          <div>
            <label className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              First name
            </label>
            <input
              className="input"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
              }}
              autoComplete="given-name"
            />
          </div>
          <div>
            <label className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Last name
            </label>
            <input
              className="input"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
              }}
              autoComplete="family-name"
            />
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Optional - leave empty to remove your last name from your profile.
            </p>
          </div>
          <div>
            <span
              className="mono"
              style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}
            >
              Choose avatar
            </span>
            <div
              className="avatar-picker-grid"
              role="radiogroup"
              aria-label="Choose avatar"
            >
              {AVATAR_PRESETS.map((preset) => {
                const selected = avatarId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={preset.label}
                    title={preset.label}
                    className={`avatar-picker-tile${selected ? ' avatar-picker-tile--selected' : ''}`}
                    onClick={() => {
                      setAvatarId(preset.id);
                    }}
                  >
                    <PresetAvatar avatarId={preset.id} size={44} />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Phone
            </label>
            <input
              className="input"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
              }}
              autoComplete="tel"
            />
          </div>
          <div
            className="card-elevated"
            style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isProfilePrivate}
                onChange={(e) => {
                  const next = e.target.checked;
                  if (next && !isProfilePrivate) {
                    const confirmed = window.confirm(
                      `${PRIVACY_NOTICE}\n\nMake your profile private?`
                    );
                    if (!confirmed) return;
                  }
                  setIsProfilePrivate(next);
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                Private profile
              </span>
            </label>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {PRIVACY_NOTICE}
            </p>
          </div>
          <div>
            <Link to="/change-password" className="auth-link" style={{ fontSize: 14 }}>
              Change password
            </Link>
          </div>
          {error !== null ? <p className="auth-feedback-error">{error}</p> : null}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => {
                void saveProfile();
              }}
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
