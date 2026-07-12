import { useEffect, useRef, useState } from 'react';
import { Button, Field, controlClass as inputClass } from '../../ui';
import { getTimezoneOptions } from '../../lib/positions.js';

export function CredentialsFields({ draft, setField, envLocked, secretPlaceholder }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="PCO App ID">
        <input
          type="text"
          autoComplete="off"
          className={inputClass}
          value={draft.pcoAppId}
          disabled={envLocked}
          placeholder={envLocked ? 'Set by environment' : ''}
          onChange={(e) => setField('pcoAppId', e.target.value)}
        />
      </Field>
      <Field label="PCO Secret">
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          value={draft.pcoSecret}
          disabled={envLocked}
          placeholder={envLocked ? 'Set by environment' : secretPlaceholder || ''}
          onChange={(e) => setField('pcoSecret', e.target.value)}
        />
      </Field>
    </div>
  );
}

export function ServiceTypeField({ draft, setField, serviceTypes }) {
  const rows = (serviceTypes?.data || [])
    .slice()
    .sort((a, b) => (a.attributes?.name || '').localeCompare(b.attributes?.name || ''));

  useEffect(() => {
    if (rows.length && !rows.some((t) => t.id === draft.serviceTypeId)) {
      setField('serviceTypeId', rows[0].id);
    }
  }, [serviceTypes, draft.serviceTypeId]);

  return (
    <Field label="Service Type" fullSpan hint="This becomes the default service the dashboard loads when the app opens.">
      <select
        className={inputClass}
        value={draft.serviceTypeId}
        onChange={(e) => setField('serviceTypeId', e.target.value)}
      >
        {!rows.length && <option value="">No service types loaded yet</option>}
        {rows.map((t) => (
          <option key={t.id} value={t.id}>
            {t.attributes?.name || 'Unnamed service type'}
          </option>
        ))}
      </select>
    </Field>
  );
}

function LogoField({ draft, setField }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file) {
    if (!file || !/^image\/(png|jpeg)$/.test(file.type)) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Downscale to 128px max so the data URL stays small in settings.json
      const max = 128;
      const scale = Math.min(max / img.width, max / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      setField('orgLogo', canvas.toDataURL('image/png'));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }

  return (
    <Field label="Logo" fullSpan hint="Shown in the header instead of the emoji icon.">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] text-[20px]">
          {draft.orgLogo ? (
            <img src={draft.orgLogo} alt="Logo preview" className="h-full w-full object-contain" />
          ) : (
            draft.orgIcon || '⛪'
          )}
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex-1 cursor-pointer rounded-lg border border-dashed px-4 py-3 text-center text-[13px] font-medium ${
            dragOver
              ? 'border-[var(--accent-border-strong)] bg-[var(--accent-bg)] text-[var(--text)]'
              : 'border-white/15 bg-white/[0.03] text-[var(--muted)] hover:border-white/25'
          }`}
        >
          Drag a .png or .jpg here, or click to browse
        </div>
        {draft.orgLogo && (
          <Button variant="secondary" onClick={() => setField('orgLogo', '')}>
            Remove
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </Field>
  );
}

export function DisplayFields({ draft, setField, includePollInterval }) {
  const zones = getTimezoneOptions();
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Organization Name">
        <input type="text" className={inputClass} value={draft.orgName} onChange={(e) => setField('orgName', e.target.value)} />
      </Field>
      <Field label="Sub Label">
        <input type="text" className={inputClass} value={draft.orgSub} onChange={(e) => setField('orgSub', e.target.value)} />
      </Field>
      <Field label="Icon">
        <input
          type="text"
          maxLength={4}
          className={inputClass}
          value={draft.orgIcon}
          onChange={(e) => setField('orgIcon', e.target.value)}
        />
      </Field>
      <Field label="Timezone">
        <select className={inputClass} value={draft.timezone} onChange={(e) => setField('timezone', e.target.value)}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </Field>
      <LogoField draft={draft} setField={setField} />
      {includePollInterval && (
        <Field label="Poll Interval">
          <select
            className={inputClass}
            value={String(draft.pollIntervalMs)}
            onChange={(e) => setField('pollIntervalMs', Number(e.target.value))}
          >
            <option value="30000">30 seconds</option>
            <option value="60000">1 minute</option>
            <option value="120000">2 minutes</option>
            <option value="300000">5 minutes</option>
            <option value="0">Off</option>
          </select>
        </Field>
      )}
    </div>
  );
}

export function TeamMatchingFields({ draft, setField }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Production Team Name">
        <input
          type="text"
          className={inputClass}
          value={draft.videoTeamName}
          onChange={(e) => setField('videoTeamName', e.target.value)}
        />
      </Field>
      <Field label="Band / Vocal Team Names">
        <input
          type="text"
          className={inputClass}
          value={draft.bandTeamNamesText}
          onChange={(e) => setField('bandTeamNamesText', e.target.value)}
        />
      </Field>
      <Field label="Highlighted Member Keywords" fullSpan>
        <input
          type="text"
          className={inputClass}
          value={draft.directorKeywordsText}
          onChange={(e) => setField('directorKeywordsText', e.target.value)}
        />
      </Field>
    </div>
  );
}
