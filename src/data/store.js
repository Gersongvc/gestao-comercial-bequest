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
      // Zera dezembro se for exatamente o valor de referência 2025 (migração de dados antigos)
      const arr = [...out[cod]];
      if (arr[11] === (CUSTODIA_FINAL_2025[cod] || null)) arr[11] = 0;
      out[cod] = arr;
    }
  });
  return out;
}
function sanitizarDezCap(data) {
  const out = { ...data };
  // Para captação não há valor fixo de referência — apenas garante que o array tem 12 posições
  // Se Dez tiver sido preenchido com CAPTACAO_TOTAL_2025, já foi removido no dados.js
  return out;
}

export function getCustodia()          { return sanitizarDez(load(KEY_CUSTODIA, CUSTODIA_INICIAL)); }
export function saveCustodia(data)     { save(KEY_CUSTODIA, data); }

export function getCaptacao()          { return load(KEY_CAPTACAO, CAPTACAO_INICIAL); }
export function saveCaptacao(data)     { save(KEY_CAPTACAO, data); }

/* ════════════════════════════════════════════════════════════════
   LÓGICA DE DISTRIBUIÇÃO DE METAS 2026
   ────────────────────────────────────────────────────────────────

   STEP 1 — Calcula o alvo total do TIME:
     alvo_custodia  = soma(bases_2025) × (1 + 21%)
     alvo_captacao  = soma(captações_2025) × (1 + 25%)

   STEP 2 — Calcula o DELTA total:
     delta_custodia = alvo_custodia  − soma(bases_2025)
     delta_captacao = alvo_captacao  − soma(captações_2025)

   STEP 3 — Distribui o delta proporcionalmente pela CARTEIRA:
     peso_i = custodia_i / soma(custodias)

     delta_custodia_i = delta_custodia  × peso_i
     delta_captacao_i = delta_captacao  × peso_i

   Por que pela CARTEIRA e não pelo número individual?
   • Custódia: matematicamente equivale a base_i × 21%, mas garante que
     a SOMA das metas individuais == META DO TIME.
   • Captação: assessores com captação negativa em 2025 recebiam metas
     ainda mais negativas (crescer 25% de −5M = −6,25M). Usando a
     carteira como peso, todos recebem uma meta POSITIVA proporcional
     ao seu tamanho de livro, e a soma ainda fecha no alvo consolidado.

   STEP 4 — CUSTÓDIA: progressão LINEAR mês a mês
     meta_cust[i]  = base_i + delta_custodia_i × (i+1)/12
     (Jan = +1/12 do delta, Dez = +12/12 = alvo completo)

   STEP 5 — CAPTAÇÃO: parcela mensal FIXA
     meta_cap[i]   = alvo_captacao_i / 12
     (mesmo valor em todos os meses; base + delta proporcional / 12)
════════════════════════════════════════════════════════════════ */

function buildPesos(ativos) {
  const total = ativos.reduce((s, a) => s + (CUSTODIA_FINAL_2025[a.cod] || 0), 0);
  const pesos = {};
  ativos.forEach(a => { pesos[a.cod] = total > 0 ? (CUSTODIA_FINAL_2025[a.cod] || 0) / total : 0; });
  return pesos;
}

// opts = { tipo: 'pct' | 'valor', valor: number }
//   pct   → valor é o % de crescimento (ex: 21 para 21%)
//   valor → valor é o delta total R$ do time
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

// opts = { tipo: 'pct' | 'valor', valor: number }
//   pct   → valor é o % de crescimento sobre a captação 2025 (ex: 25 para 25%)
//   valor → valor é o delta total R$ anual do time a distribuir
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
