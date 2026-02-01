import { API_BASE } from '../utils/constants';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export function startSimulation(params) {
  return request('/start', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function pauseSimulation() {
  return request('/pause', { method: 'POST' });
}

export function resetSimulation() {
  return request('/reset', { method: 'POST' });
}

export function updateConfig(params) {
  return request('/config/update', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function selectPolicy(policy, deterministic = true) {
  return request('/policy/select', {
    method: 'POST',
    body: JSON.stringify({ policy, deterministic }),
  });
}

export function getState() {
  return request('/state');
}

export function getHealth() {
  return request('/health');
}

export function getMetricsHistory(window = 12) {
  return request(`/metrics/history?window=${window}`);
}
