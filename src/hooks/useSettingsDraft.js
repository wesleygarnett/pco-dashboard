import { useState } from 'react';
import { testCredentials as apiTestCredentials, getServiceTypes } from '../api/client.js';
import { getDefaultVideoPositions, patternFromLabel, readCommaList } from '../lib/positions.js';

function draftFromSettings(cfg) {
  return {
    pcoAppId: cfg.pcoAppId || '',
    pcoSecret: '',
    serviceTypeId: cfg.serviceTypeId || '',
    serviceTypeName: cfg.serviceTypeName || '',
    orgName: cfg.orgName || 'My Church',
    orgSub: cfg.orgSub || 'Sunday Services',
    orgIcon: cfg.orgIcon || '⛪',
    timezone: cfg.timezone || 'America/New_York',
    videoTeamName: cfg.videoTeamName || 'video production',
    bandTeamNamesText: (cfg.bandTeamNames || []).join(', '),
    directorKeywordsText: (cfg.directorKeywords || []).join(', '),
    pollIntervalMs: cfg.pollIntervalMs ?? 60000,
    videoPositions: (cfg.videoPositions || getDefaultVideoPositions()).map((p) => ({ ...p })),
  };
}

export function useSettingsDraft(cfg) {
  const [draft, setDraft] = useState(() => draftFromSettings(cfg));
  const [serviceTypes, setServiceTypes] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });

  const envLocked = !!cfg.envLocked;

  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function updatePosition(index, patch) {
    setDraft((d) => {
      const next = [...d.videoPositions];
      const current = next[index];
      const merged = { ...current, ...patch };
      // Preserve stored pattern if the label hasn't changed; otherwise auto-generate.
      if ('label' in patch) {
        merged.pattern =
          patch.label === current._originalLabel && current._originalPattern
            ? current._originalPattern
            : patternFromLabel(patch.label);
      }
      next[index] = merged;
      return { ...d, videoPositions: next };
    });
  }

  function addPosition() {
    setDraft((d) => ({ ...d, videoPositions: [...d.videoPositions, { label: '', pattern: '', isDir: false }] }));
  }

  function removePosition(index) {
    setDraft((d) => ({ ...d, videoPositions: d.videoPositions.filter((_, i) => i !== index) }));
  }

  function resetPositions() {
    setDraft((d) => ({ ...d, videoPositions: getDefaultVideoPositions() }));
  }

  async function loadServiceTypesFromServer() {
    const types = await getServiceTypes().catch(() => null);
    if (types) setServiceTypes(types);
    return types;
  }

  async function testConnection() {
    if (envLocked) {
      setStatus({ message: 'Credentials are managed by environment variables for this build.', type: '' });
      return false;
    }
    setStatus({ message: 'Testing connection…', type: '' });
    try {
      const appId = draft.pcoAppId.trim();
      const secret = draft.pcoSecret.trim();
      if (!appId || !secret) throw new Error('Enter both an App ID and Secret to test the connection.');
      const result = await apiTestCredentials({ appId, secret });
      setServiceTypes(result.serviceTypes);
      setStatus({ message: 'Connection successful. Service types loaded.', type: 'ok' });
      return true;
    } catch (e) {
      setStatus({ message: e.message, type: 'error' });
      return false;
    }
  }

  function buildPayload({ includePollInterval } = {}) {
    const serviceTypeName =
      serviceTypes?.data?.find((t) => t.id === draft.serviceTypeId)?.attributes?.name || draft.serviceTypeName || '';
    const payload = {
      serviceTypeId: draft.serviceTypeId,
      serviceTypeName,
      orgName: draft.orgName.trim(),
      orgSub: draft.orgSub.trim(),
      orgIcon: draft.orgIcon.trim(),
      timezone: draft.timezone,
      videoTeamName: draft.videoTeamName.trim(),
      bandTeamNames: readCommaList(draft.bandTeamNamesText),
      directorKeywords: readCommaList(draft.directorKeywordsText),
      videoPositions: draft.videoPositions
        .map((p) => ({ label: p.label.trim(), pattern: p.pattern, isDir: !!p.isDir }))
        .filter((p) => p.label),
    };
    if (includePollInterval) payload.pollIntervalMs = Number(draft.pollIntervalMs);
    if (!envLocked) payload.pcoAppId = draft.pcoAppId.trim();
    if (draft.pcoSecret.trim()) payload.pcoSecret = draft.pcoSecret.trim();
    return payload;
  }

  return {
    draft,
    setField,
    serviceTypes,
    setServiceTypes,
    status,
    setStatus,
    envLocked,
    updatePosition,
    addPosition,
    removePosition,
    resetPositions,
    testConnection,
    loadServiceTypesFromServer,
    buildPayload,
  };
}
