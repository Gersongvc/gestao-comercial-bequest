import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { MESES, MESES_FULL, CIDADES, COR_CIDADE, COR_BG, META_XP_CONSOLIDADO, META_PESSOAL_CONSOLIDADO, CUSTODIA_FINAL_2025, CAPTACAO_TOTAL_2025, CRESCIMENTO_CUSTODIA_2026, CRESCIMENTO_CAPTACAO_2026 } from '../data/dados';
import { getAssessores, getCustodia, getCaptacao, getMetasCustodia, getMetasCaptacao } from '../data/store';
import { fmtMCustodia, fmtM, fmtPct, iniciais } from '../utils/fmt';

Chart.register(...registerables);

function StatusPill({ pct }) {
  if (pct === null) return <span className="badge badge-gray">—</span>;
  if (pct >= 100) return <span className="badge badge-green">≥100%</span>;
  if (pct >= 80)  return <span className="badge badge-amber">≥80%</span>;
  return <span className="badge badge-red">&lt;80%</span>;
}

function ProgressBar({ pct, markerPct }) {
  const fill = Math.min(pct || 0, 100);
  const color = fill >= 100 ? 'var(--green)' : fill >= 80 ? 'var(--amber)' : 'var(--red)';
  const marker = markerPct !== null ? Math.min(markerPct, 100) : null;
  return (
    <div style={{ minWidth: 120 }}>
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${fill}%`, background: color }} />
        {marker !== null && (
          <div className="progress-marker" style={{ left: `${marker}%` }} />
        )}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{fmtPct(pct)}</div>
    </div>
  );
}

/* ── Tab: Ranking ── */
function Ranking({ assessores, custodia, metas }) {
  const [mes, setMes] = useState(4);
  const [filtro, setFiltro] = useState('');

  const lista = assessores
    .filter(a => a.ativo && (!filtro || a.cidade === filtro))
    .map(a => {
      const cust = custodia[a.cod]?.[mes] || 0;
      const metaXP   = metas[a.cod]?.[mes] || 0;
      const metaPess = metas[a.cod]?.[mes] || 0;
      const pctXP   = metaXP   > 0 ? (cust / metaXP)   * 100 : null;
      const pctPess = metaPess > 0 ? (cust / metaPess)  * 100 : null;
      const markerXP = (metaXP > 0 && metaPess > 0) ? (metaPess / metaXP) * 100 : null;
      return { ...a, cust, metaXP, metaPess, pctXP, pctPess, markerXP };
    })
    .sort((a, b) => b.cust - a.cust)
    .map((a, i) => ({ ...a, pos: i + 1 }));

  return (
    <>
      <div className="filters-bar">
        <select value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todas as cidades</option>
          {Object.entries(CIDADES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
        <div className="toggle-group">
          {MESES.map((m, i) => (
            <button key={i} className={`toggle-btn ${mes === i ? 'active' : ''}`} onClick={() => setMes(i)}>{m}</button>
          ))}
        </div>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Assessor</th>
              <th>Cidade</th>
              <th style={{ textAlign: 'right' }}>Custódia</th>
              <th style={{ textAlign: 'right' }}>Meta XP</th>
              <th style={{ minWidth: 160 }}>% XP</th>
              <th style={{ textAlign: 'right' }}>Meta Pessoal</th>
              <th style={{ textAlign: 'right' }}>% Pessoal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(a => (
              <tr key={a.cod}>
                <td style={{ fontWeight: 700, color: a.pos <= 3 ? 'var(--amber)' : 'var(--text3)', width: 32 }}>{a.pos}</td>
                <td>
                  <div className="assessor-cell">
                    <div className="avatar" style={{ background: COR_CIDADE[a.cidade] }}>{iniciais(a.nome)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.cod}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="cidade-pill" style={{ background: COR_BG[a.cidade], color: COR_CIDADE[a.cidade] }}>
                    {CIDADES[a.cidade]}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontWeight: 600 }}>{fmtMCustodia(a.cust)}</td>
                <td style={{ textAlign: 'right', color: 'var(--text3)', fontSize: 12 }}>{fmtMCustodia(a.metaXP)}</td>
                <td><ProgressBar pct={a.pctXP} markerPct={a.markerXP} /></td>
                <td style={{ textAlign: 'right', color: 'var(--text3)', fontSize: 12 }}>{fmtMCustodia(a.metaPess)}</td>
                <td style={{ textAlign: 'right' }}>{a.pctPess !== null ? <span style={{ fontWeight: 600, color: a.pctPess >= 100 ? 'var(--green)' : a.pctPess >= 80 ? 'var(--amber)' : 'var(--red)' }}>{fmtPct(a.pctPess)}</span> : '—'}</td>
                <td><StatusPill pct={a.pctXP} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ── Tab: Mês a mês ── */
function MesAMes({ assessores, custodia, captacao, metasCust, metasCap }) {
  const mesAtual = new Date().getMonth();
  const [subtipo,      setSubtipo]      = useState('custodia');
  const [modo,         setModo]         = useState('mensal');   // 'mensal' | 'acumulado'
  const [periodo,      setPeriodo]      = useState('ano');      // 'ano' | 'ult12'
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroNome,   setFiltroNome]   = useState('');
  const [rollover,     setRollover]     = useState(true);  // arrastar déficit para o mês seguinte

  const ativos = assessores
    .filter(a => a.ativo)
    .filter(a => !filtroCidade || a.cidade === filtroCidade)
    .filter(a => !filtroNome   || a.nome.toLowerCase().includes(filtroNome.toLowerCase()) || a.cod.toLowerCase().includes(filtroNome.toLowerCase()));

  const isCust   = subtipo === 'custodia';
  const realData = isCust ? custodia  : captacao;
  const metaData = isCust ? metasCust : metasCap;

  // Custódia: dados brutos = estoque acumulado
  //   Produção Mensal → delta mês a mês  |  Acumulado → valor bruto
  // Captação: dados brutos = fluxo mensal
  //   Produção Mensal → valor bruto      |  Acumulado → soma Jan..i
  function realVal(cod, i) {
    const curr = realData[cod]?.[i] || 0;
    if (isCust) {
      if (modo === 'acumulado') return curr;
      // Mensal: se o mês atual não tem dado, delta = 0
      if (!curr) return 0;
      const prev = i === 0 ? (CUSTODIA_FINAL_2025[cod] || 0) : (realData[cod]?.[i - 1] || 0);
      return curr - prev;
    } else {
      if (modo === 'mensal') return curr;
      // Acumulado captação: soma Jan..i, ignorando meses sem dado a partir do primeiro zero
      let acc = 0;
      for (let j = 0; j <= i; j++) acc += realData[cod]?.[j] || 0;
      return acc;
    }
  }
  function metaVal(cod, i) {
    const curr = metaData[cod]?.[i] || 0;
    if (isCust) {
      // Metas de custódia armazenadas como delta mensal (quanto o assessor deve crescer no mês)
      if (modo === 'mensal') return curr;
      // Acumulado: base Dez/25 + soma dos deltas Jan..i
      let acc = CUSTODIA_FINAL_2025[cod] || 0;
      for (let j = 0; j <= i; j++) acc += metaData[cod]?.[j] || 0;
      return acc;
    } else {
      if (modo === 'mensal') return curr;
      let acc = 0;
      for (let j = 0; j <= i; j++) acc += metaData[cod]?.[j] || 0;
      return acc;
    }
  }

  // Colunas dinâmicas: Ano Atual (Jan-Dez) ou Últimos 12 meses (rolling)
  const colunas = periodo === 'ano'
    ? MESES.map((m, i) => ({ label: m, ano: 2026, mes: i }))
    : (() => {
        const slots = [];
        for (let k = 0; k < 12; k++) {
          const offset = k - 11;
          const mesIdx = ((mesAtual + offset) % 12 + 12) % 12;
          const ano    = mesAtual + offset < 0 ? 2025 : 2026;
          slots.push({ label: `${MESES[mesIdx]}/${String(ano).slice(2)}`, ano, mes: mesIdx });
        }
        return slots;
      })();

  // Slot-aware: para meses de 2025 só temos o estoque final (Dez/25) e sem meta mensal
  function realValS(cod, slot) {
    if (slot.ano === 2025) {
      if (isCust && modo === 'acumulado') return CUSTODIA_FINAL_2025[cod] || 0;
      return 0;
    }
    return realVal(cod, slot.mes);
  }
  function metaValS(cod, slot) {
    if (slot.ano === 2025) return 0;
    return metaVal(cod, slot.mes);
  }
  // Objetivo ajustado: em modo mensal com rollover ativo, soma o déficit do mês anterior
  function metaAjustadoS(cod, k) {
    if (modo !== 'mensal' || !rollover) return metaValS(cod, colunas[k]);
    let carry = 0;
    for (let j = 0; j <= k; j++) {
      const slot = colunas[j];
      const adj  = metaValS(cod, slot) + carry;
      if (j === k) return adj;
      // Só arrasta déficit de meses passados/correntes, não de meses futuros
      const isPastOrCurrent = slot.ano < 2026 || slot.mes <= mesAtual;
      if (isPastOrCurrent) carry = Math.max(0, adj - realValS(cod, slot));
    }
    return 0;
  }

  const totalRealizadoS = k => ativos.reduce((s, a) => s + realValS(a.cod, colunas[k]), 0);
  const totalObjetivoS  = k => ativos.reduce((s, a) => s + metaAjustadoS(a.cod, k), 0);
  const totalSaldoS     = k => totalRealizadoS(k) - totalObjetivoS(k);

  function saldoColor(v) {
    if (v > 0)  return 'var(--green)';
    if (v < 0)  return 'var(--red)';
    return 'var(--text3)';
  }

  function fmtVal(v, forceSign = false) {
    if (!isCust) {
      if (v === 0) return <span style={{ color: '#C8CFE0' }}>—</span>;
      const sign = v > 0 ? '+' : '−';
      return <span style={{ color: saldoColor(v) }}>{forceSign ? sign : (v < 0 ? '−' : '')}R$ {fmtMCustodia(Math.abs(v)).replace('R$ ', '')}</span>;
    }
    if (v === 0) return <span style={{ color: 'var(--text3)' }}>—</span>;
    if (forceSign) {
      const sign = v >= 0 ? '+' : '−';
      return <span style={{ color: saldoColor(v) }}>{sign}R$ {fmtMCustodia(Math.abs(v)).replace('R$ ', '')}</span>;
    }
    return fmtMCustodia(v);
  }

  // Totais consolidados por linha-tipo (respeitam modo mensal/acumulado)
  const totalRealizado = i => ativos.reduce((s, a) => s + realVal(a.cod, i), 0);
  const totalObjetivo  = i => ativos.reduce((s, a) => s + metaVal(a.cod, i), 0);
  const totalSaldo     = i => totalRealizado(i) - totalObjetivo(i);

  return (
    <>
    {/* ── Barra de filtros ── */}
    <div className="filters-bar" style={{ marginBottom: 12 }}>
      <input
        placeholder="Buscar assessor ou código..."
        value={filtroNome}
        onChange={e => setFiltroNome(e.target.value)}
        style={{ width: 220 }}
      />
      <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)}>
        <option value="">Todas as cidades</option>
        {Object.entries(CIDADES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
      </select>
      {(filtroCidade || filtroNome) && (
        <button className="btn btn-outline btn-sm" onClick={() => { setFiltroCidade(''); setFiltroNome(''); }}>
          <i className="ti ti-x" /> Limpar filtros
        </button>
      )}
      <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 4 }}>
        {ativos.length} assessor{ativos.length !== 1 ? 'es' : ''} exibido{ativos.length !== 1 ? 's' : ''}
      </span>
    </div>

    <div className="table-card">
      {/* sub-toggle + legenda */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div className="toggle-group">
          <button className={`toggle-btn ${isCust ? 'active' : ''}`} onClick={() => setSubtipo('custodia')}>
            <i className="ti ti-building-bank" style={{ marginRight: 4 }} />Custódia
          </button>
          <button className={`toggle-btn ${!isCust ? 'active' : ''}`} onClick={() => setSubtipo('captacao')}>
            <i className="ti ti-trending-up" style={{ marginRight: 4 }} />Captação
          </button>
        </div>

        {/* Toggle modo */}
        <div className="toggle-group">
          <button
            className={`toggle-btn ${modo === 'mensal' ? 'active' : ''}`}
            onClick={() => setModo('mensal')}
            title={isCust
              ? 'Delta produzido no mês — ideal para reunião individual'
              : 'Valor captado no mês'}
          >
            <i className="ti ti-calendar-stats" style={{ marginRight: 4 }} />Mensal
          </button>
          <button
            className={`toggle-btn ${modo === 'acumulado' ? 'active' : ''}`}
            onClick={() => setModo('acumulado')}
            title={isCust
              ? 'Saldo total da carteira (estoque)'
              : 'Soma acumulada Jan → mês'}
          >
            <i className="ti ti-stack" style={{ marginRight: 4 }} />Acumulado
          </button>
        </div>

        {/* Toggle período */}
        <div className="toggle-group">
          <button className={`toggle-btn ${periodo === 'ano' ? 'active' : ''}`} onClick={() => setPeriodo('ano')}
            title="Janeiro a Dezembro do ano atual">
            <i className="ti ti-calendar" style={{ marginRight: 4 }} />Ano Atual
          </button>
          <button className={`toggle-btn ${periodo === 'ult12' ? 'active' : ''}`} onClick={() => setPeriodo('ult12')}
            title="Rolling 12 meses até o mês atual">
            <i className="ti ti-clock-12" style={{ marginRight: 4 }} />Últ. 12 Meses
          </button>
        </div>

        {/* Toggle arrastar saldo — só faz sentido em modo mensal */}
        {modo === 'mensal' && (
          <button
            className={`toggle-btn ${rollover ? 'active' : ''}`}
            onClick={() => setRollover(r => !r)}
            title="Quando ativo: déficit do mês anterior é somado ao Objetivo do mês seguinte"
            style={{ fontSize: 11 }}
          >
            <i className="ti ti-arrow-forward-up" style={{ marginRight: 4 }} />Arrastar Saldo
          </button>
        )}

        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text3)' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--blue)', borderRadius: 2, marginRight: 5, verticalAlign: 'middle' }} />Realizado</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#C8CFE0', borderRadius: 2, marginRight: 5, verticalAlign: 'middle' }} />Objetivo</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--green)', borderRadius: 2, marginRight: 5, verticalAlign: 'middle' }} />Saldo +</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--red)', borderRadius: 2, marginRight: 5, verticalAlign: 'middle' }} />Saldo −</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>
          {modo === 'mensal' && isCust  && 'Δ custódia = variação da carteira no mês'}
          {modo === 'mensal' && !isCust && 'Captação produzida no mês'}
          {modo === 'acumulado' && isCust  && 'Saldo total da carteira (estoque acumulado)'}
          {modo === 'acumulado' && !isCust && 'Captação acumulada Jan → mês'}
        </span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 2, minWidth: 240 }}>Assessor</th>
              <th style={{ position: 'sticky', left: 240, background: 'var(--surface2)', zIndex: 2, minWidth: 90, fontSize: 10 }}>Linha</th>
              <th style={{ textAlign: 'right', minWidth: 130, background: '#FFFBF0', color: 'var(--amber)', fontSize: 10, whiteSpace: 'nowrap' }}>
                Base 2025
              </th>
              <th style={{ textAlign: 'right', minWidth: 130, background: '#F0FAF5', color: 'var(--green)', fontSize: 10, whiteSpace: 'nowrap' }}>
                {isCust ? 'Meta Dez/2026' : 'Meta Anual 2026'}
              </th>
              {colunas.map((slot, k) => {
                const isHl = slot.ano === 2026 && slot.mes === mesAtual;
                return (
                  <th key={k} style={{
                    textAlign: 'right', minWidth: 155,
                    background: isHl ? '#EEF3FC' : slot.ano === 2025 ? '#FDF9F0' : undefined,
                    color: isHl ? 'var(--blue)' : slot.ano === 2025 ? 'var(--amber)' : undefined,
                  }}>
                    {slot.label}{isHl ? ' ◀' : ''}
                  </th>
                );
              })}
              <th style={{ textAlign: 'right', minWidth: 165, background: '#1A1F36', color: '#fff', fontSize: 11, whiteSpace: 'nowrap', borderLeft: '3px solid #1A1F36' }}>
                {periodo === 'ano' ? '∑ Total Ano' : '∑ Últ. 12 Meses'}
              </th>
            </tr>
          </thead>
          <tbody>
            {ativos.map((a, idx) => {
              const bordTop  = idx > 0 ? '2px solid var(--border)' : undefined;
              const base2025 = isCust ? (CUSTODIA_FINAL_2025[a.cod] || 0) : (CAPTACAO_TOTAL_2025[a.cod] || 0);

              // Meta 2026: para custódia = base × 1.21 (alvo Dez/26)
              //            para captação = alvo anual proporcional (base + delta × peso)
              const totalCustBase = assessores.filter(x => x.ativo).reduce((s, x) => s + (CUSTODIA_FINAL_2025[x.cod] || 0), 0);
              const totalCapBase  = assessores.filter(x => x.ativo).reduce((s, x) => s + (CAPTACAO_TOTAL_2025[x.cod]  || 0), 0);
              const peso          = totalCustBase > 0 ? (CUSTODIA_FINAL_2025[a.cod] || 0) / totalCustBase : 0;
              const meta2026      = isCust
                ? base2025 + totalCustBase * CRESCIMENTO_CUSTODIA_2026 * peso
                : base2025 + totalCapBase  * CRESCIMENTO_CAPTACAO_2026  * peso;

              const CELL_BASE = { textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 600 };
              const CELL_ANO  = { textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 700, borderLeft: '3px solid #1A1F36', background: '#F0F2FA' };

              const anoReal  = colunas.reduce((s, slot) => s + realValS(a.cod, slot), 0);
              const anoMeta  = colunas.reduce((s, _, k) => s + metaAjustadoS(a.cod, k), 0);
              const anoSaldo = anoReal - anoMeta;

              return (
                <>
                  {/* Linha Realizado */}
                  <tr key={`${a.cod}-r`} style={{ borderTop: bordTop }}>
                    <td rowSpan={3} style={{
                      position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1,
                      borderRight: '1px solid var(--border)', verticalAlign: 'middle',
                      borderTop: bordTop,
                    }}>
                      <div className="assessor-cell">
                        <div className="avatar" style={{ background: COR_CIDADE[a.cidade] }}>{iniciais(a.nome)}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{a.nome}</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                            <span className="cidade-pill" style={{ background: COR_BG[a.cidade], color: COR_CIDADE[a.cidade], fontSize: 10, padding: '1px 6px' }}>{a.cidade}</span>
                            <span style={{ fontSize: 10, color: 'var(--text3)' }}>{a.cod}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ position: 'sticky', left: 240, background: '#EAF1FB', zIndex: 1, fontSize: 11, fontWeight: 600, color: 'var(--blue)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)' }}>
                      ✦ Realizado
                    </td>
                    {/* Base 2025 — só na linha Realizado (rowSpan=3) */}
                    <td rowSpan={3} style={{ ...CELL_BASE, background: '#FFFBF0', color: 'var(--amber)', verticalAlign: 'middle', borderLeft: '1px solid #F0D18C' }}>
                      {isCust
                        ? fmtMCustodia(base2025)
                        : <span className={base2025 >= 0 ? 'val-pos' : 'val-neg'}>{fmtM(base2025)}</span>
                      }
                    </td>
                    {/* Meta 2026 — só na linha Realizado (rowSpan=3) */}
                    <td rowSpan={3} style={{ ...CELL_BASE, background: '#F0FAF5', color: 'var(--green)', verticalAlign: 'middle', borderLeft: '1px solid #A8DFC8', borderRight: '2px solid var(--border)' }}>
                      {isCust
                        ? fmtMCustodia(meta2026)
                        : <span className={meta2026 >= 0 ? 'val-pos' : 'val-neg'}>{fmtM(meta2026)}</span>
                      }
                    </td>
                    {colunas.map((slot, k) => {
                      const v = realValS(a.cod, slot);
                      const isHl = slot.ano === 2026 && slot.mes === mesAtual;
                      return (
                        <td key={k} style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 500, background: isHl ? '#F0F5FF' : slot.ano === 2025 ? '#FDFAF3' : undefined }}>
                          {fmtVal(v)}
                        </td>
                      );
                    })}
                    {/* Total Ano — Realizado */}
                    <td rowSpan={3} style={{ ...CELL_ANO, verticalAlign: 'middle' }}>
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Realizado</div>
                        <span style={{ color: anoReal >= 0 ? 'var(--blue)' : 'var(--red)' }}>{fmtVal(anoReal)}</span>
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Objetivo</div>
                        <span style={{ color: 'var(--text3)' }}>{fmtVal(anoMeta)}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Saldo</div>
                        <span style={{ color: anoSaldo >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>{fmtVal(anoSaldo, true)}</span>
                      </div>
                    </td>
                  </tr>

                  {/* Linha Objetivo */}
                  <tr key={`${a.cod}-o`}>
                    <td style={{ position: 'sticky', left: 240, background: '#F5F5F5', zIndex: 1, fontSize: 11, fontWeight: 500, color: 'var(--text3)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)' }}>
                      ○ Objetivo
                    </td>
                    {colunas.map((slot, k) => {
                      const v        = metaAjustadoS(a.cod, k);
                      const hasCarry = rollover && modo === 'mensal' && v > metaValS(a.cod, slot);
                      const isHl     = slot.ano === 2026 && slot.mes === mesAtual;
                      return (
                        <td key={k} style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 12, color: 'var(--text3)', background: hasCarry ? '#FFF3E0' : isHl ? '#F8F9FE' : slot.ano === 2025 ? '#FDFAF3' : '#FAFBFD' }}>
                          {v !== 0 ? fmtVal(v) : <span style={{ color: '#C8CFE0' }}>—</span>}
                          {hasCarry && <span style={{ fontSize: 8, color: '#E65100', marginLeft: 2, verticalAlign: 'super' }}>↑carry</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Linha Saldo */}
                  <tr key={`${a.cod}-s`}>
                    <td style={{ position: 'sticky', left: 240, background: '#F0F3FA', zIndex: 1, fontSize: 11, fontWeight: 700, color: 'var(--text2)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border)' }}>
                      △ Saldo
                    </td>
                    {colunas.map((slot, k) => {
                      const real  = realValS(a.cod, slot);
                      const obj   = metaAjustadoS(a.cod, k);
                      const isHl  = slot.ano === 2026 && slot.mes === mesAtual;
                      if (!real && !obj) return (
                        <td key={k} style={{ textAlign: 'right', background: isHl ? '#F0F5FF' : slot.ano === 2025 ? '#FDFAF3' : '#F4F6FB' }}>
                          <span style={{ color: '#C8CFE0', fontSize: 12 }}>—</span>
                        </td>
                      );
                      const saldo = real - obj;
                      return (
                        <td key={k} style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 700, background: isHl ? '#EEF3FC' : slot.ano === 2025 ? '#FDFAF3' : '#F4F6FB' }}>
                          {fmtVal(saldo, true)}
                        </td>
                      );
                    })}
                  </tr>
                </>
              );
            })}

            {/* ── Totais ── */}
            {(() => {
              const totalBase2025 = ativos.reduce((s, a) =>
                s + (isCust ? (CUSTODIA_FINAL_2025[a.cod] || 0) : (CAPTACAO_TOTAL_2025[a.cod] || 0)), 0);
              const totalCustBase = assessores.filter(x => x.ativo).reduce((s, x) => s + (CUSTODIA_FINAL_2025[x.cod] || 0), 0);
              const totalCapBase  = assessores.filter(x => x.ativo).reduce((s, x) => s + (CAPTACAO_TOTAL_2025[x.cod]  || 0), 0);
              const totalMeta2026 = ativos.reduce((s, a) => {
                const peso = totalCustBase > 0 ? (CUSTODIA_FINAL_2025[a.cod] || 0) / totalCustBase : 0;
                return s + (isCust
                  ? (CUSTODIA_FINAL_2025[a.cod] || 0) + totalCustBase * CRESCIMENTO_CUSTODIA_2026 * peso
                  : (CAPTACAO_TOTAL_2025[a.cod]  || 0) + totalCapBase  * CRESCIMENTO_CAPTACAO_2026  * peso);
              }, 0);
              const anoTotalReal  = colunas.reduce((s, _, k) => s + totalRealizadoS(k), 0);
              const anoTotalMeta  = colunas.reduce((s, _, k) => s + totalObjetivoS(k), 0);
              const anoTotalSaldo = anoTotalReal - anoTotalMeta;
              const CELL_ANO_TOT  = { textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 700, borderLeft: '3px solid #1A1F36', background: '#E8EAF6' };

              return (
                <>
                  <tr style={{ borderTop: '3px solid var(--border)' }}>
                    <td style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 1, fontWeight: 700 }}>TOTAL</td>
                    <td style={{ position: 'sticky', left: 240, background: '#EAF1FB', zIndex: 1, fontSize: 11, fontWeight: 600, color: 'var(--blue)', borderRight: '1px solid var(--border)' }}>✦ Realizado</td>
                    {/* Base 2025 total */}
                    <td rowSpan={3} style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, background: '#FFFBF0', color: 'var(--amber)', verticalAlign: 'middle', borderLeft: '1px solid #F0D18C' }}>
                      {isCust ? fmtMCustodia(totalBase2025) : <span className={totalBase2025 >= 0 ? 'val-pos' : 'val-neg'}>{fmtM(totalBase2025)}</span>}
                    </td>
                    {/* Meta 2026 total */}
                    <td rowSpan={3} style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 11, fontWeight: 700, background: '#F0FAF5', color: 'var(--green)', verticalAlign: 'middle', borderLeft: '1px solid #A8DFC8', borderRight: '2px solid var(--border)' }}>
                      {isCust ? fmtMCustodia(totalMeta2026) : <span className={totalMeta2026 >= 0 ? 'val-pos' : 'val-neg'}>{fmtM(totalMeta2026)}</span>}
                    </td>
                    {colunas.map((slot, k) => {
                      const isHl = slot.ano === 2026 && slot.mes === mesAtual;
                      return (
                        <td key={k} style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontWeight: 700, background: isHl ? '#EEF3FC' : slot.ano === 2025 ? '#FDF9F0' : 'var(--surface2)' }}>
                          {fmtVal(totalRealizadoS(k))}
                        </td>
                      );
                    })}
                    {/* Total Ano — consolidado (rowSpan=3) */}
                    <td rowSpan={3} style={{ ...CELL_ANO_TOT, verticalAlign: 'middle' }}>
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Realizado</div>
                        <span style={{ color: anoTotalReal >= 0 ? 'var(--blue)' : 'var(--red)' }}>{fmtVal(anoTotalReal)}</span>
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Objetivo</div>
                        <span style={{ color: 'var(--text3)' }}>{fmtVal(anoTotalMeta)}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>Saldo</div>
                        <span style={{ color: anoTotalSaldo >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>{fmtVal(anoTotalSaldo, true)}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 1 }} />
                    <td style={{ position: 'sticky', left: 240, background: '#F5F5F5', zIndex: 1, fontSize: 11, fontWeight: 500, color: 'var(--text3)', borderRight: '1px solid var(--border)' }}>○ Objetivo</td>
                    {colunas.map((slot, k) => {
                      const v = totalObjetivoS(k);
                      const isHl = slot.ano === 2026 && slot.mes === mesAtual;
                      return (
                        <td key={k} style={{ textAlign: 'right', fontFamily: 'Space Grotesk', color: 'var(--text3)', background: isHl ? '#F8F9FE' : slot.ano === 2025 ? '#FDF9F0' : '#FAFBFD' }}>
                          {v !== 0 ? fmtVal(v) : <span style={{ color: '#C8CFE0' }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 1 }} />
                    <td style={{ position: 'sticky', left: 240, background: '#F0F3FA', zIndex: 1, fontSize: 11, fontWeight: 700, color: 'var(--text2)', borderRight: '1px solid var(--border)' }}>△ Saldo</td>
                    {colunas.map((slot, k) => {
                      const s = totalSaldoS(k);
                      const hasData = totalRealizadoS(k) !== 0 || totalObjetivoS(k) !== 0;
                      const isHl = slot.ano === 2026 && slot.mes === mesAtual;
                      return (
                        <td key={k} style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontWeight: 700, background: isHl ? '#EEF3FC' : slot.ano === 2025 ? '#FDF9F0' : '#F4F6FB' }}>
                          {hasData ? fmtVal(s, true) : <span style={{ color: '#C8CFE0' }}>—</span>}
                        </td>
                      );
                    })}
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}

/* ── Tab: Por cidade ── */
function PorCidade({ assessores, custodia, captacao, metasCust, metasCap }) {
  const mesAtual = new Date().getMonth();
  const [mes, setMes] = useState(mesAtual);

  const custEmpRef  = useRef(null);
  const capEmpRef   = useRef(null);
  const custLinRef  = useRef(null);
  const capAcumRef  = useRef(null);
  const pctCustRef  = useRef(null);
  const pctCapRef   = useRef(null);
  const instRefs    = useRef({});

  function useC(key, ref, builder, deps) {
    useEffect(() => {
      if (!ref.current) return;
      if (instRefs.current[key]) instRefs.current[key].destroy();
      instRefs.current[key] = builder(ref.current);
      return () => instRefs.current[key]?.destroy();
    }, deps);
  }

  const ativos = assessores.filter(a => a.ativo);
  const cidades = Object.keys(CIDADES);

  // ── Dados por cidade ──
  const custCity  = c => MESES.map((_, i) => ativos.filter(a => a.cidade === c).reduce((s, a) => s + (custodia[a.cod]?.[i] || 0), 0));
  const capCity   = c => MESES.map((_, i) => ativos.filter(a => a.cidade === c).reduce((s, a) => s + (captacao[a.cod]?.[i] || 0), 0));
  const metaCCity = c => MESES.map((_, i) => ativos.filter(a => a.cidade === c).reduce((s, a) => s + (metasCust[a.cod]?.[i] || 0), 0));
  const metaKCity = c => MESES.map((_, i) => ativos.filter(a => a.cidade === c).reduce((s, a) => s + (metasCap[a.cod]?.[i] || 0), 0));

  // Métricas no mês selecionado por cidade
  const metricas = cidades.map(c => {
    const membros   = ativos.filter(a => a.cidade === c);
    const custMes   = custCity(c)[mes];
    const metaCMes  = metaCCity(c)[mes];
    const capAcum   = MESES.slice(0, mes + 1).reduce((s, __, i) => s + capCity(c)[i], 0);
    const metaKAcum = MESES.slice(0, mes + 1).reduce((s, __, i) => s + metaKCity(c)[i], 0);
    const base2025  = membros.reduce((s, a) => s + (CUSTODIA_FINAL_2025[a.cod] || 0), 0);
    const alvo2026  = base2025 * (1 + CRESCIMENTO_CUSTODIA_2026);
    const pctCust   = metaCMes  > 0 ? (custMes  / metaCMes)  * 100 : null;
    const pctCap    = metaKAcum !== 0 ? (capAcum / metaKAcum) * 100 : null;
    const crescCust = base2025  > 0 ? ((custMes - base2025)  / base2025) * 100 : null;
    const totalGrupo = ativos.reduce((s, a) => s + (custodia[a.cod]?.[mes] || 0), 0);
    const share      = totalGrupo > 0 ? (custMes / totalGrupo) * 100 : 0;
    return { c, nome: CIDADES[c], membros: membros.length, custMes, metaCMes, capAcum, metaKAcum, base2025, alvo2026, pctCust, pctCap, crescCust, share };
  });

  // Rankings: 1 = melhor
  const rankBy = (arr, key, desc = true) => {
    const sorted = [...arr].sort((a, b) => desc ? b[key] - a[key] : a[key] - b[key]);
    return Object.fromEntries(sorted.map((item, i) => [item.c, i + 1]));
  };
  const rkCust    = rankBy(metricas, 'custMes');
  const rkCap     = rankBy(metricas, 'capAcum');
  const rkPctCust = rankBy(metricas.filter(m => m.pctCust !== null), 'pctCust');
  const rkPctCap  = rankBy(metricas.filter(m => m.pctCap  !== null), 'pctCap');
  const rkCresc   = rankBy(metricas.filter(m => m.crescCust !== null), 'crescCust');

  // Pontuação geral (menor soma de ranks = melhor)
  const scoreFinal = metricas.map(m => ({
    c: m.c,
    score: (rkCust[m.c] || 4) + (rkCap[m.c] || 4) + (rkPctCust[m.c] || 4) + (rkPctCap[m.c] || 4) + (rkCresc[m.c] || 4),
  })).sort((a, b) => a.score - b.score);
  const rkGeral = Object.fromEntries(scoreFinal.map((item, i) => [item.c, i + 1]));

  const medalha = pos => pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;

  // ── Gráficos ──
  const yFmt = v => Math.abs(v) >= 1e9 ? `R$ ${(v/1e9).toFixed(1)}B` : `R$ ${(v/1e6).toFixed(0)}M`;
  const yFmtK = v => Math.abs(v) >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : `R$ ${(v/1e3).toFixed(0)}k`;

  // 1 — custódia empilhada
  useC('custEmp', custEmpRef, canvas => new Chart(canvas, {
    type: 'bar',
    data: { labels: MESES, datasets: cidades.map(c => ({ label: CIDADES[c], data: custCity(c), backgroundColor: COR_CIDADE[c], borderRadius: 3 })) },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 11, font: { size: 11 } } } },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: yFmt, font: { size: 10 } } } }
    }
  }), [mes]);

  // 2 — captação empilhada
  useC('capEmp', capEmpRef, canvas => new Chart(canvas, {
    type: 'bar',
    data: { labels: MESES, datasets: cidades.map(c => ({ label: CIDADES[c], data: capCity(c).map((v, i) => i <= mes ? v : null), backgroundColor: COR_CIDADE[c], borderRadius: 3 })) },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 11, font: { size: 11 } } } },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: yFmtK, font: { size: 10 } } } }
    }
  }), [mes]);

  // 3 — custódia linha por cidade (evolução)
  useC('custLin', custLinRef, canvas => new Chart(canvas, {
    type: 'line',
    data: { labels: MESES, datasets: cidades.map(c => ({ label: CIDADES[c], data: custCity(c), borderColor: COR_CIDADE[c], backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, pointRadius: 3 })) },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 11, font: { size: 11 } } } },
      scales: { x: { grid: { color: '#E2E7F0' } }, y: { ticks: { callback: yFmt, font: { size: 10 } }, grid: { color: '#E2E7F0' } } }
    }
  }), []);

  // 4 — captação acumulada vs meta (por cidade, linhas)
  useC('capAcum', capAcumRef, canvas => {
    const ds = [];
    cidades.forEach(c => {
      const real = MESES.map((_, i) => i <= mes ? MESES.slice(0, i + 1).reduce((s, __, j) => s + capCity(c)[j], 0) : null);
      const meta = MESES.map((_, i) => MESES.slice(0, i + 1).reduce((s, __, j) => s + metaKCity(c)[j], 0));
      ds.push({ label: `${CIDADES[c]} Real.`, data: real, borderColor: COR_CIDADE[c], backgroundColor: 'transparent', tension: 0.3, borderWidth: 2.5, pointRadius: 3 });
      ds.push({ label: `${CIDADES[c]} Meta`, data: meta, borderColor: COR_CIDADE[c], backgroundColor: 'transparent', borderDash: [4, 3], tension: 0.3, borderWidth: 1, pointRadius: 0 });
    });
    return new Chart(canvas, {
      type: 'line', data: { labels: MESES, datasets: ds },
      options: { responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 11, font: { size: 10 }, filter: i => !i.text.includes('Meta') } } },
        scales: { x: { grid: { color: '#E2E7F0' } }, y: { ticks: { callback: yFmtK, font: { size: 10 } }, grid: { color: '#E2E7F0' } } }
      }
    });
  }, [mes]);

  // 5 — % atingimento custódia por cidade (barras horizontais)
  useC('pctCust', pctCustRef, canvas => {
    const sorted = [...metricas].sort((a, b) => (b.pctCust || 0) - (a.pctCust || 0));
    return new Chart(canvas, {
      type: 'bar',
      data: { labels: sorted.map(m => m.nome), datasets: [{
        label: '% Meta Custódia',
        data: sorted.map(m => m.pctCust !== null ? Math.min(m.pctCust, 150) : 0),
        backgroundColor: sorted.map(m => (m.pctCust || 0) >= 100 ? '#1D9E75' : (m.pctCust || 0) >= 80 ? '#F59E0B' : '#D85A30'),
        borderRadius: 5,
      }]},
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: 60 } },
        plugins: { legend: { display: false } },
        scales: { x: { min: 0, max: 150, ticks: { callback: v => `${v}%`, font: { size: 10 } }, grid: { color: '#E2E7F0' } }, y: { grid: { display: false }, ticks: { font: { size: 12 } } } }
      },
      plugins: [{ id: 'lbls', afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.getDatasetMeta(0).data.forEach((bar, i) => {
          const v = sorted[i].pctCust;
          if (v === null) return;
          ctx.save(); ctx.font = 'bold 11px Space Grotesk'; ctx.fillStyle = '#444';
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(`${v.toFixed(1)}%`, bar.x + 6, bar.y);
          ctx.restore();
        });
      }}]
    });
  }, [mes]);

  // 6 — % atingimento captação por cidade
  useC('pctCap', pctCapRef, canvas => {
    const sorted = [...metricas].sort((a, b) => (b.pctCap || 0) - (a.pctCap || 0));
    return new Chart(canvas, {
      type: 'bar',
      data: { labels: sorted.map(m => m.nome), datasets: [{
        label: '% Meta Captação',
        data: sorted.map(m => m.pctCap !== null ? Math.min(Math.max(m.pctCap, 0), 150) : 0),
        backgroundColor: sorted.map(m => (m.pctCap || 0) >= 100 ? '#1D9E75' : (m.pctCap || 0) >= 80 ? '#F59E0B' : '#D85A30'),
        borderRadius: 5,
      }]},
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: 60 } },
        plugins: { legend: { display: false } },
        scales: { x: { min: 0, max: 150, ticks: { callback: v => `${v}%`, font: { size: 10 } }, grid: { color: '#E2E7F0' } }, y: { grid: { display: false }, ticks: { font: { size: 12 } } } }
      },
      plugins: [{ id: 'lbls2', afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.getDatasetMeta(0).data.forEach((bar, i) => {
          const v = sorted[i].pctCap;
          if (v === null) return;
          ctx.save(); ctx.font = 'bold 11px Space Grotesk'; ctx.fillStyle = '#444';
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(`${v.toFixed(1)}%`, bar.x + 6, bar.y);
          ctx.restore();
        });
      }}]
    });
  }, [mes]);

  return (
    <>
      {/* Seletor de mês */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>Mês de referência:</label>
        <div className="toggle-group">
          {MESES.map((m, i) => (
            <button key={i} className={`toggle-btn ${mes === i ? 'active' : ''}`} onClick={() => setMes(i)}>{m}</button>
          ))}
        </div>
      </div>

      {/* ── Ranking Geral ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Ranking Geral de Performance — {MESES_FULL[mes]} (pontuação composta)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {scoreFinal.map((item, idx) => {
            const m = metricas.find(x => x.c === item.c);
            return (
              <div key={item.c} style={{
                background: '#fff', borderRadius: 12, padding: '16px 18px',
                border: `2px solid ${idx === 0 ? '#F59E0B' : 'var(--border)'}`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 10, right: 14, fontSize: 28, opacity: 0.12, fontWeight: 900 }}>{idx + 1}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{medalha(idx + 1)}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: COR_CIDADE[item.c] }}>{CIDADES[item.c]}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { label: 'Custódia', rank: rkCust[item.c] },
                    { label: '% Meta Cust.', rank: rkPctCust[item.c] },
                    { label: 'Captação', rank: rkCap[item.c] },
                    { label: '% Meta Cap.', rank: rkPctCap[item.c] },
                    { label: 'Crescimento', rank: rkCresc[item.c] },
                  ].map(r => (
                    <div key={r.label} style={{ background: 'var(--bg)', borderRadius: 6, padding: '4px 8px' }}>
                      <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 1 }}>{r.label}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: r.rank === 1 ? '#F59E0B' : r.rank === 2 ? '#94A3B8' : r.rank === 3 ? '#CD7F32' : 'var(--text3)' }}>
                        {r.rank ? medalha(r.rank) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── KPIs por cidade ── */}
      <div style={{ marginBottom: 16, fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>
        Métricas por Cidade — {MESES_FULL[mes]}
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <thead>
            <tr style={{ background: 'var(--surface2)', fontSize: 11, color: 'var(--text3)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left' }}>Cidade</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Assessores</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Custódia {MESES[mes]}</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>% Meta Cust.</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Captação Acum.</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>% Meta Cap.</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>Rank</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Cresc. vs Dez/25</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>Share Custódia</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>🏆 Geral</th>
            </tr>
          </thead>
          <tbody>
            {metricas.sort((a, b) => rkGeral[a.c] - rkGeral[b.c]).map(m => {
              const pctC = m.pctCust;
              const pctK = m.pctCap;
              const corP = p => p === null ? '#C8CFE0' : p >= 100 ? '#1D9E75' : p >= 80 ? '#F59E0B' : '#D85A30';
              return (
                <tr key={m.c} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: COR_CIDADE[m.c] }} />
                      <span style={{ fontWeight: 600, color: COR_CIDADE[m.c] }}>{m.nome}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text3)' }}>{m.membros}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'Space Grotesk', fontWeight: 600 }}>{fmtMCustodia(m.custMes)}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: rkCust[m.c] === 1 ? '#F59E0B' : 'var(--text3)' }}>{medalha(rkCust[m.c])}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: corP(pctC) }}>{pctC !== null ? fmtPct(pctC) : '—'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: rkPctCust[m.c] === 1 ? '#F59E0B' : 'var(--text3)' }}>{rkPctCust[m.c] ? medalha(rkPctCust[m.c]) : '—'}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'Space Grotesk', fontWeight: 600 }}>
                    <span className={m.capAcum >= 0 ? 'val-pos' : 'val-neg'}>{fmtM(m.capAcum)}</span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: rkCap[m.c] === 1 ? '#F59E0B' : 'var(--text3)' }}>{medalha(rkCap[m.c])}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: corP(pctK) }}>{pctK !== null ? fmtPct(pctK) : '—'}</td>
                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: rkPctCap[m.c] === 1 ? '#F59E0B' : 'var(--text3)' }}>{rkPctCap[m.c] ? medalha(rkPctCap[m.c]) : '—'}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: (m.crescCust || 0) >= 0 ? '#1D9E75' : '#D85A30' }}>
                    {m.crescCust !== null ? fmtPct(m.crescCust) : '—'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <div style={{ height: 6, width: 60, background: '#E2E7F0', borderRadius: 3 }}>
                        <div style={{ height: 6, borderRadius: 3, background: COR_CIDADE[m.c], width: `${m.share}%` }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtPct(m.share)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', fontSize: 20 }}>{medalha(rkGeral[m.c])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Gráficos ── */}
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Gráficos Comparativos
      </div>
      <div className="charts-row" style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-title">Custódia Mensal por Cidade (empilhada)</div>
          <div className="chart-wrap" style={{ height: 240 }}><canvas ref={custEmpRef} /></div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Captação Mensal por Cidade (empilhada)</div>
          <div className="chart-wrap" style={{ height: 240 }}><canvas ref={capEmpRef} /></div>
        </div>
      </div>
      <div className="charts-row" style={{ marginBottom: 16 }}>
        <div className="chart-card">
          <div className="chart-title">Evolução Custódia por Cidade (linhas)</div>
          <div className="chart-wrap" style={{ height: 240 }}><canvas ref={custLinRef} /></div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Captação Acumulada vs Meta por Cidade</div>
          <div className="chart-wrap" style={{ height: 240 }}><canvas ref={capAcumRef} /></div>
        </div>
      </div>
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">% Atingimento Meta Custódia por Cidade — {MESES_FULL[mes]}</div>
          <div className="chart-wrap" style={{ height: 160 }}><canvas ref={pctCustRef} /></div>
        </div>
        <div className="chart-card">
          <div className="chart-title">% Atingimento Meta Captação Acum. — Jan–{MESES[mes]}</div>
          <div className="chart-wrap" style={{ height: 160 }}><canvas ref={pctCapRef} /></div>
        </div>
      </div>
    </>
  );
}

/* ── Tab: Custódia XP / Pessoal ── */
function CustodiaXP() {
  const lineRef = useRef(null);
  const barRef  = useRef(null);
  const lineInst = useRef(null);
  const barInst  = useRef(null);

  const xp = META_XP_CONSOLIDADO;
  const pp = META_PESSOAL_CONSOLIDADO;

  const mesAtual = new Date().getMonth();
  const aucAtual = xp.aucBase2025[mesAtual];
  const estAtual = xp.estimativaAcumulada[mesAtual];
  const objXPMes = xp.objetivoMes[mesAtual];
  const objPesMes = pp.objetivoMes[mesAtual];

  useEffect(() => {
    if (!lineRef.current) return;
    if (lineInst.current) lineInst.current.destroy();
    lineInst.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: MESES,
        datasets: [
          { label: 'AuC Base 2025', data: xp.aucBase2025, borderColor: '#185FA5', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, pointRadius: 3 },
          { label: 'Estimativa XP', data: xp.estimativaAcumulada, borderColor: '#1D9E75', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, borderDash: [4,4], pointRadius: 3 },
          { label: 'Objetivo Pessoal', data: pp.objetivoAcumulado, borderColor: '#D85A30', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2, borderDash: [2,2], pointRadius: 3 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          x: { grid: { color: '#E2E7F0' } },
          y: { ticks: { callback: v => v >= 1e9 ? `R$ ${(v/1e9).toFixed(1)}B` : `R$ ${(v/1e6).toFixed(0)}M` }, grid: { color: '#E2E7F0' } }
        }
      }
    });
    return () => lineInst.current?.destroy();
  }, []);

  useEffect(() => {
    if (!barRef.current) return;
    if (barInst.current) barInst.current.destroy();
    const saldos = xp.aucBase2025.map((v, i) => v - xp.estimativaAcumulada[i]);
    barInst.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: MESES,
        datasets: [{
          label: 'Saldo (AuC - Meta XP)',
          data: saldos,
          backgroundColor: saldos.map(v => v >= 0 ? '#1D9E75' : '#D85A30'),
          borderRadius: 5,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { ticks: { callback: v => v >= 0 ? `+R$ ${(v/1e6).toFixed(1)}M` : `-R$ ${Math.abs(v/1e6).toFixed(1)}M` }, grid: { color: '#E2E7F0' } }
        }
      }
    });
    return () => barInst.current?.destroy();
  }, []);

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">AuC Base 2025</div>
          <div className="kpi-value">{fmtMCustodia(aucAtual)}</div>
          <div className="kpi-sub">{MESES_FULL[mesAtual]}</div>
        </div>
        <div className="kpi-card positive">
          <div className="kpi-label">Estimativa XP</div>
          <div className="kpi-value">{fmtMCustodia(estAtual)}</div>
          <div className="kpi-sub">acumulada {MESES_FULL[mesAtual]}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Objetivo Mês XP</div>
          <div className="kpi-value">{fmtMCustodia(objXPMes)}</div>
          <div className="kpi-sub">{MESES_FULL[mesAtual]}</div>
        </div>
        <div className="kpi-card negative">
          <div className="kpi-label">Meta Pessoal Mês</div>
          <div className="kpi-value">{fmtMCustodia(objPesMes)}</div>
          <div className="kpi-sub">{MESES_FULL[mesAtual]}</div>
        </div>
      </div>
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">AuC Base vs Estimativa XP vs Objetivo Pessoal</div>
          <div className="chart-wrap"><canvas ref={lineRef} /></div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Saldo Mensal (AuC Base − Estimativa XP)</div>
          <div className="chart-wrap"><canvas ref={barRef} /></div>
        </div>
      </div>
    </>
  );
}

/* ── Main ── */
export default function Acompanhamento() {
  const [tab, setTab] = useState('ranking');
  const assessores = getAssessores();
  const custodia   = getCustodia();
  const captacao   = getCaptacao();
  const metasCust  = getMetasCustodia();
  const metasCap   = getMetasCaptacao();

  const TABS = [
    { id: 'ranking',    label: 'Ranking' },
    { id: 'mesmames',   label: 'Mês a mês' },
    { id: 'porcidade',  label: 'Por cidade' },
    { id: 'custxp',     label: 'Custódia XP / Pessoal' },
  ];

  return (
    <>
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ranking'   && <Ranking assessores={assessores} custodia={custodia} metas={metasCust} />}
      {tab === 'mesmames'  && <MesAMes assessores={assessores} custodia={custodia} captacao={captacao} metasCust={metasCust} metasCap={metasCap} />}
      {tab === 'porcidade' && <PorCidade assessores={assessores} custodia={custodia} captacao={captacao} metasCust={metasCust} metasCap={metasCap} />}
      {tab === 'custxp'    && <CustodiaXP />}
    </>
  );
}
