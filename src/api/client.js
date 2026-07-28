async function get(url) {
  const r = await fetch(url);
  if (!r.ok) {
    const j = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(j.error || `HTTP ${r.status}`);
  }
  return r.json();
}

async function postJson(url, payload) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${r.status}`);
  }
  return data;
}

async function putJson(url, payload) {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${r.status}`);
  }
  return data;
}

export const getSettings = () => get('/api/settings');
export const saveSettings = (payload) => postJson('/api/settings', payload);
export const resetSettings = () => postJson('/api/settings/reset');
export const testCredentials = (payload) => postJson('/api/settings/test-credentials', payload);
export const getServiceTypes = () => get('/api/service-types');
export const getPlans = (serviceTypeId) => get(`/api/plans?serviceTypeId=${encodeURIComponent(serviceTypeId)}`);
export const getPlan = (serviceTypeId, planId) =>
  get(`/api/plan?serviceTypeId=${encodeURIComponent(serviceTypeId)}&planId=${encodeURIComponent(planId)}`);
export const getItemNoteCategories = (serviceTypeId) =>
  get(`/api/item-note-categories?serviceTypeId=${encodeURIComponent(serviceTypeId)}`);
export const saveItemNote = (serviceTypeId, planId, itemId, payload) =>
  putJson(
    `/api/item-note?serviceTypeId=${encodeURIComponent(serviceTypeId)}` +
      `&planId=${encodeURIComponent(planId)}&itemId=${encodeURIComponent(itemId)}`,
    payload,
  );
