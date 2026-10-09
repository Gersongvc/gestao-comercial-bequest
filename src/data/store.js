import { ASSESSORES_INICIAL, CUSTODIA_INICIAL, CAPTACAO_INICIAL, META_XP_CONSOLIDADO, META_PESSOAL_CONSOLIDADO } from './dados.js';

const KEYS = {
  assessores: 'bc_assessores',
  custodia:   'bc_custodia',
  captacao:   'bc_captacao',
  metaxp:     'bc_metaxp',
  metapes:    'bc_metapes',
};

// Versão dos dados — incrementar sempre que atualizar dados em dados.js
const DATA_VERSION = '2026-09';
const VERSION_KEY  = 'bc_data_version';

// Se a versão mudou, limpa o cache e força recarregar dos dados do código
function checkVersion() {
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored !== DATA_VERSION) {
      Object.values(KEYS).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
    }
  } catch {}
}
checkVersion();

function get(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function set(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export const getAssessores   = ()  => get(KEYS.assessores, ASSESSORES_INICIAL);
export const setAssessores   = (v) => set(KEYS.assessores, v);
export const getCustodia     = ()  => get(KEYS.custodia, CUSTODIA_INICIAL);
export const setCustodia     = (v) => set(KEYS.custodia, v);
export const getCaptacao     = ()  => get(KEYS.captacao, CAPTACAO_INICIAL);
export const setCaptacao     = (v) => set(KEYS.captacao, v);
export const getMetaXP       = ()  => get(KEYS.metaxp,   META_XP_CONSOLIDADO);
export const setMetaXP       = (v) => set(KEYS.metaxp, v);
export const getMetaPessoal  = ()  => get(KEYS.metapes,  META_PESSOAL_CONSOLIDADO);
export const setMetaPessoal  = (v) => set(KEYS.metapes, v);
