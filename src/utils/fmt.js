const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const BRL0 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/* Custódia e valores positivos — R$ 154.300.212,71 */
export function fmtBRL(v, decimals = 2) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return decimals === 0 ? BRL0.format(v) : BRL.format(v);
}

/* Alias para custódia (mantém compatibilidade com código existente) */
export function fmtMCustodia(v) {
  if (v === null || v === undefined || isNaN(v) || v === 0) return '—';
  return BRL.format(v);
}

/* Captação (pode ser negativa) — mostra sinal explícito: +R$ 1.116.567,33 ou −R$ 657.433,72 */
export function fmtM(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  if (v === 0) return 'R$ 0,00';
  const sign = v > 0 ? '+' : '−';
  return `${sign}${BRL.format(Math.abs(v))}`;
}

export function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return `${v.toFixed(1)}%`;
}

export function iniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(' ');
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
