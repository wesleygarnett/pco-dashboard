import { Field, controlClass as inputClass } from '../../ui';
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
