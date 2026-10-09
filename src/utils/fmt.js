export const fmtBRL = (v, compact = false) => {
  if (!v && v !== 0) return '—';
  if (compact) {
    const abs = Math.abs(v);
    let s;
    if (abs >= 1e9) s = (v / 1e9).toFixed(1) + ' B';
    else if (abs >= 1e6) s = (v / 1e6).toFixed(1) + ' M';
    else if (abs >= 1e3) s = (v / 1e3).toFixed(0) + ' K';
    else s = v.toFixed(0);
    return 'R$ ' + s;
  }
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
};

export const fmtPct = (v) => {
  if (!v && v !== 0) return '—';
  return v.toFixed(1) + '%';
};

export const initials = (nome) => {
  const parts = nome.trim().split(' ');
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
};

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
