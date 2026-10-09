import {
  ASSESSORES_INICIAL, CUSTODIA_INICIAL, CAPTACAO_INICIAL,
  CUSTODIA_FINAL_2025, CAPTACAO_TOTAL_2025,
  CRESCIMENTO_CUSTODIA_2026, CRESCIMENTO_CAPTACAO_2026,
} from './dados';

const KEY_ASSESSORES     = 'bc_assessores';
const KEY_CUSTODIA       = 'bc_custodia';
const KEY_CAPTACAO       = 'bc_captacao';
const KEY_METAS_CUSTODIA = 'bc_metas_custodia';
const KEY_METAS_CAPTACAO = 'bc_metas_captacao';

// Versão dos dados — incrementar sempre que atualizar dados em dados.js
const DATA_VERSION = '2026-09';
const VERSION_KEY  = 'bc_data_version';

// Se a versão mudou, limpa o cache e força recarregar dos dados do código
function checkVersion() {
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored !== DATA_VERSION) {
      [KEY_ASSESSORES, KEY_CUSTODIA, KEY_CAPTACAO, KEY_METAS_CUSTODIA, KEY_METAS_CAPTACAO]
        .forEach(k => localStorage.removeItem(k));
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
    }
  } catch {}
}
checkVersion();

function load(key, fallback) {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
}
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

export function getAssessores()        { return load(KEY_ASSESSORES, ASSESSORES_INICIAL); }
export function saveAssessores(list)   { save(KEY_ASSESSORES, list); }

// Garante que o índice 11 (Dezembro) nunca venha pré-semeado com dados de 2025
function sanitizarDez(data) {
  const out = { ...data };
  Object.keys(out).forEach(cod => {
    if (Array.isArray(out[cod]) && out[cod].length === 12) {
      const arr = [...out[cod]];
      if (arr[11] === (CUSTODIA_FINAL_2025[cod] || null)) arr[11] = 0;
      out[cod] = arr;
    }
  });
  return out;
}

export function getCustodia()          { return sanitizarDez(load(KEY_CUSTODIA, CUSTODIA_INICIAL)); }
export function saveCustodia(data)     { save(KEY_CUSTODIA, data); }

export function getCaptacao()          { return load(KEY_CAPTACAO, CAPTACAO_INICIAL); }
export function saveCaptacao(data)     { save(KEY_CAPTACAO, data); }

/* ════════════════════════════════════════════════════════════════
   LÓGICA DE DISTRIBUIÇÃO DE METAS 2026
════════════════════════════════════════════════════════════════ */

function buildPesos(ativos) {
  const total = ativos.reduce((s, a) => s + (CUSTODIA_FINAL_2025[a.cod] || 0), 0);
  const pesos = {};
  ativos.forEach(a => { pesos[a.cod] = total > 0 ? (CUSTODIA_FINAL_2025[a.cod] || 0) / total : 0; });
  return pesos;
}

export function gerarMetasCustodia2026(assessores, opts = { tipo: 'pct', valor: CRESCIMENTO_CUSTODIA_2026 * 100 }) {
  const ativos = assessores.filter(a => a.ativo);
  const pesos  = buildPesos(ativos);
  const totalBase2025  = ativos.reduce((s, a) => s + (CUSTODIA_FINAL_2025[a.cod] || 0), 0);
  const deltaTimeAnual = opts.tipo === 'pct'
    ? totalBase2025 * (opts.valor / 100)
    : opts.valor;

  const r = {};
  ativos.forEach(a => {
    const deltaAssess = deltaTimeAnual * pesos[a.cod];
    const mensal = Math.round(deltaAssess / 12);
    r[a.cod] = Array(12).fill(mensal);
  });
  return r;
}

export function gerarMetasCaptacao2026(assessores, opts = { tipo: 'pct', valor: CRESCIMENTO_CAPTACAO_2026 * 100 }) {
  const ativos = assessores.filter(a => a.ativo);
  const pesos  = buildPesos(ativos);
  const totalCap2025   = ativos.reduce((s, a) => s + (CAPTACAO_TOTAL_2025[a.cod] || 0), 0);
  const deltaTimeAnual = opts.tipo === 'pct'
    ? totalCap2025 * (opts.valor / 100)
    : opts.valor;

  const r = {};
  ativos.forEach(a => {
    const baseCap2025 = CAPTACAO_TOTAL_2025[a.cod] || 0;
    const deltaAssess = deltaTimeAnual * pesos[a.cod];
    const alvoAnual   = baseCap2025 + deltaAssess;
    const mensal      = Math.round(alvoAnual / 12);
    r[a.cod] = Array(12).fill(mensal);
  });
  return r;
}

export function getMetasCustodia() {
  const fallback = {};
  getAssessores().forEach(a => { fallback[a.cod] = Array(12).fill(0); });
  return load(KEY_METAS_CUSTODIA, fallback);
}
export function saveMetasCustodia(data) { save(KEY_METAS_CUSTODIA, data); }

export function getMetasCaptacao() {
  const fallback = {};
  getAssessores().forEach(a => { fallback[a.cod] = Array(12).fill(0); });
  return load(KEY_METAS_CAPTACAO, fallback);
}
export function saveMetasCaptacao(data) { save(KEY_METAS_CAPTACAO, data); }

/* ── Compatibilidade legado ── */
export function getMetas()      { return getMetasCustodia(); }
export function saveMetas(data) { saveMetasCustodia(data); }

// Aliases simples (usados em algumas páginas que importam do store antigo)
export const getAssessores_   = getAssessores;
export const getCustodia_     = getCustodia;
export const getCaptacao_     = getCaptacao;
