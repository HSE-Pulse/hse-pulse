// Runtime config from container entrypoint (injected via /config.js)
const cfg = (typeof window !== 'undefined' && window.__MEDISYNC_CONFIG__) || {};

// Use same origin for Cloud Run deployment (UI and API on same domain)
const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsHost = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';

export const API_BASE = cfg.API_BASE || origin;
export const WS_URL = cfg.WS_URL || `${wsProtocol}//${wsHost}/stream/metrics`;

export const DEPARTMENTS = [
  'Emergency Department',
  'ED Observation',
  'Medicine',
  'Med/Surg',
  'Medicine/Cardiology',
  'Neurology',
  'ICU',
  'Stepdown Unit',
  'Discharge Lounge',
];

export const DEPT_COLORS = {
  'Emergency Department': '#ef4444',
  'ED Observation': '#f97316',
  'Medicine': '#3b82f6',
  'Med/Surg': '#8b5cf6',
  'Medicine/Cardiology': '#ec4899',
  'Neurology': '#14b8a6',
  'ICU': '#dc2626',
  'Stepdown Unit': '#f59e0b',
  'Discharge Lounge': '#22c55e',
};

export const DEPT_SHORT = {
  'Emergency Department': 'ED',
  'ED Observation': 'ED Obs',
  'Medicine': 'Med',
  'Med/Surg': 'M/S',
  'Medicine/Cardiology': 'Card',
  'Neurology': 'Neuro',
  'ICU': 'ICU',
  'Stepdown Unit': 'SDU',
  'Discharge Lounge': 'Disch',
};

export const STAFF_ROLES = ['doctors', 'nurses', 'hcws', 'admins'];

export const STAFF_BOUNDS = {
  doctors: { min: 1, max: 20 },
  nurses: { min: 1, max: 30 },
  hcws: { min: 0, max: 15 },
  admins: { min: 0, max: 10 },
};

export const SPEED_LABELS = {
  1: 'Slow',
  2: 'Normal',
  3: 'Fast',
  4: 'Faster',
  5: 'Very Fast',
  6: 'Max',
};

export const STAGES = [
  { value: 1, label: 'Stage 1: Easy' },
  { value: 2, label: 'Stage 2: Medium-Easy' },
  { value: 3, label: 'Stage 3: Medium' },
  { value: 4, label: 'Stage 4: Medium-Hard' },
  { value: 5, label: 'Stage 5: Full Difficulty' },
];

export const POLICIES = [
  { value: 'mappo', label: 'MAPPO (MARL)' },
  { value: 'maddpg', label: 'MADDPG (MARL)' },
  { value: 'baseline', label: 'Baseline (Fixed)' },
];
