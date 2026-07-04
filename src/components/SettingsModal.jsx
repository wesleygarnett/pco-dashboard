import { useEffect, useState } from 'react';
import { Overlay, StatusLine, Button } from '../ui';
import { CredentialsFields, ServiceTypeField, DisplayFields, TeamMatchingFields } from './settings/SettingsFields.jsx';
import PositionsEditor from './settings/PositionsEditor.jsx';
import { useSettingsDraft } from '../hooks/useSettingsDraft.js';
import { saveSettings as apiSaveSettings, resetSettings as apiResetSettings } from '../api/client.js';

function SectionCard({ title, help, children }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-[14px] font-bold uppercase tracking-wide text-[var(--muted)]">
        {title}
        {help && <span className="ml-2 text-[11px] font-normal normal-case text-[var(--dim)]">{help}</span>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsModal({ cfg, onClose, onSaved, onSetupRequired }) {
  const form = useSettingsDraft(cfg);
  const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });

  useEffect(() => {
    form.loadServiceTypesFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaveStatus({ message: 'Saving settings…', type: '' });
    try {
      const result = await apiSaveSettings(form.buildPayload({ includePollInterval: true }));
      const settings = result.settings;
      if (settings.setupRequired) {
        onSetupRequired(settings);
        return;
      }
      onSaved(settings);
    } catch (e) {
      setSaveStatus({ message: e.message, type: 'error' });
    }
  }

  async function handleResetAll() {
    if (!window.confirm('Reset all saved settings and reopen the setup wizard?')) return;
    try {
      const result = await apiResetSettings();
      onSetupRequired(result.settings);
    } catch (e) {
      setSaveStatus({ message: e.message, type: 'error' });
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[22px] font-bold text-[var(--text)]">Dashboard Settings</div>
          <div className="mt-1 text-[14px] text-[var(--muted)]">
            Adjust credentials, organization labels, polling, team matching, and video slot patterns without leaving
            the app.
          </div>
        </div>
        <button type="button" onClick={onClose} className="text-[22px] leading-none text-[var(--muted)]">
          ×
        </button>
      </div>

      <SectionCard title="Credentials">
        <CredentialsFields
          draft={form.draft}
          setField={form.setField}
          envLocked={form.envLocked}
          secretPlaceholder="Leave blank to keep current secret"
        />
        <StatusLine status={form.status} />
        <div className="flex justify-end">
          <Button variant="secondary"onClick={form.testConnection}>Test Connection</Button>
        </div>
      </SectionCard>

      <SectionCard title="Service and Display">
        <ServiceTypeField draft={form.draft} setField={form.setField} serviceTypes={form.serviceTypes} />
        <DisplayFields draft={form.draft} setField={form.setField} includePollInterval />
      </SectionCard>

      <SectionCard title="Team Matching" help="Match teams by name as they appear in Planning Center.">
        <TeamMatchingFields draft={form.draft} setField={form.setField} />
      </SectionCard>

      <SectionCard title="Team Positions">
        <PositionsEditor
          positions={form.draft.videoPositions}
          updatePosition={form.updatePosition}
          addPosition={form.addPosition}
          removePosition={form.removePosition}
          resetPositions={form.resetPositions}
        />
      </SectionCard>

      <StatusLine status={saveStatus} />
      <div className="flex items-center justify-between">
        <Button variant="danger"onClick={handleResetAll}>Reset All Settings</Button>
        <div className="flex gap-2">
          <Button variant="secondary"onClick={onClose}>Close</Button>
          <Button variant="primary"onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </Overlay>
  );
}
