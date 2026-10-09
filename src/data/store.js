import { ASSESSORES_INICIAL, CUSTODIA_INICIAL, CAPTACAO_INICIAL, META_XP_CONSOLIDADO, META_PESSOAL_CONSOLIDADO } from './dados.js';

const KEYS = {
  assessores: 'bc_assessores',
  custodia:   'bc_custodia',
  captacao:   'bc_captacao',
  metaxp:     'bc_metaxp',
  metapes:    'bc_metapes',
};

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
