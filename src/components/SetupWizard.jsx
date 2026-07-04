import { useEffect, useState } from 'react';
import Overlay from './settings/Overlay.jsx';
import { CredentialsFields, ServiceTypeField, DisplayFields, TeamMatchingFields } from './settings/SettingsFields.jsx';
import PositionsEditor from './settings/PositionsEditor.jsx';
import StatusLine from './settings/StatusLine.jsx';
import { PrimaryButton, SecondaryButton } from './settings/Buttons.jsx';
import { useSettingsDraft } from '../hooks/useSettingsDraft.js';
import { saveSettings as apiSaveSettings } from '../api/client.js';

const STEP_TITLES = {
  1: 'Welcome',
  2: 'Planning Center Credentials',
  3: 'Choose a Service Type',
  4: 'Display and Team Matching',
  5: 'Team Positions',
};

export default function SetupWizard({ cfg, onComplete }) {
  const form = useSettingsDraft(cfg);
  const [step, setStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });

  useEffect(() => {
    async function initial() {
      if (cfg.hasSecret) {
        const types = await form.loadServiceTypesFromServer();
        setStep(cfg.serviceTypeId && types ? 4 : 3);
      } else {
        setStep(1);
      }
    }
    initial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTestCredentials() {
    if (form.envLocked) {
      form.setStatus({ message: 'Credentials are already provided by the environment for this build.', type: '' });
      setStep(3);
      return;
    }
    const ok = await form.testConnection();
    if (ok) setStep(3);
  }

  async function handleSave() {
    setSaveStatus({ message: 'Saving settings…', type: '' });
    try {
      const result = await apiSaveSettings(form.buildPayload({ includePollInterval: false }));
      onComplete(result.settings);
    } catch (e) {
      setSaveStatus({ message: e.message, type: 'error' });
    }
  }

  return (
    <Overlay>
      <div>
        <div className="text-[22px] font-bold text-[var(--text)]">Set Up Your Dashboard</div>
        <div className="mt-1 text-[14px] text-[var(--muted)]">
          Connect Planning Center, choose the service type to display, and tune the team matching rules your room
          uses.
        </div>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="text-[18px] font-bold text-[var(--text)]">Welcome</div>
          <div className="text-[14px] text-[var(--muted)]">
            This wizard gets the app from first launch to live dashboard with no file editing.
          </div>
          <WizardButtons>
            <PrimaryButton onClick={() => setStep(2)}>Get Started</PrimaryButton>
          </WizardButtons>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="text-[18px] font-bold text-[var(--text)]">Planning Center Credentials</div>
          <CredentialsFields draft={form.draft} setField={form.setField} envLocked={form.envLocked} />
          <StatusLine status={form.status} />
          <WizardButtons>
            <SecondaryButton onClick={() => setStep(1)}>Back</SecondaryButton>
            <PrimaryButton onClick={handleTestCredentials}>Test Connection</PrimaryButton>
          </WizardButtons>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="text-[18px] font-bold text-[var(--text)]">Choose a Service Type</div>
          <ServiceTypeField draft={form.draft} setField={form.setField} serviceTypes={form.serviceTypes} />
          <WizardButtons>
            <SecondaryButton onClick={() => setStep(2)}>Back</SecondaryButton>
            <PrimaryButton onClick={() => setStep(4)}>Continue</PrimaryButton>
          </WizardButtons>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <div className="text-[18px] font-bold text-[var(--text)]">Display and Team Matching</div>
          <DisplayFields draft={form.draft} setField={form.setField} includePollInterval={false} />
          <TeamMatchingFields draft={form.draft} setField={form.setField} />
          <WizardButtons>
            <SecondaryButton onClick={() => setStep(3)}>Back</SecondaryButton>
            <PrimaryButton onClick={() => setStep(5)}>Continue</PrimaryButton>
          </WizardButtons>
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-4">
          <div className="text-[18px] font-bold text-[var(--text)]">Team Positions</div>
          <PositionsEditor
            positions={form.draft.videoPositions}
            updatePosition={form.updatePosition}
            addPosition={form.addPosition}
            removePosition={form.removePosition}
            resetPositions={form.resetPositions}
          />
          <StatusLine status={saveStatus} />
          <WizardButtons>
            <SecondaryButton onClick={() => setStep(4)}>Back</SecondaryButton>
            <PrimaryButton onClick={handleSave}>Save &amp; Launch</PrimaryButton>
          </WizardButtons>
        </div>
      )}

      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((d) => (
          <div
            key={d}
            className="h-2 w-2 rounded-full"
            style={{ background: d === step ? 'var(--purple)' : 'rgba(255,255,255,0.15)' }}
            title={STEP_TITLES[d]}
          />
        ))}
      </div>
    </Overlay>
  );
}

function WizardButtons({ children }) {
  return <div className="flex justify-end gap-2">{children}</div>;
}
