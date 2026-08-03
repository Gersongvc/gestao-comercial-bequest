import { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import {
  MESES, MESES_FULL, CIDADES, COR_CIDADE, COR_BG,
  CUSTODIA_FINAL_2025, CAPTACAO_TOTAL_2025,
  CRESCIMENTO_CUSTODIA_2026, CRESCIMENTO_CAPTACAO_2026,
} from '../data/dados';
import { getAssessores, getCustodia, getCaptacao, getMetasCustodia, getMetasCaptacao } from '../data/store';
import { fmtMCustodia, fmtM, fmtPct, iniciais } from '../utils/fmt';

Chart.register(...registerables);

/* ── util hooks ── */
function useChart(ref, builder, deps) {
  const inst = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.destroy();
    inst.current = builder(ref.current);
    return () => inst.current?.destroy();
  }, deps);
}

/* ── Medalha de posição ── */
function RankBadge({ pos, total, label, cor }) {
  const emoji = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;
  const pct   = ((total - pos) / Math.max(total - 1, 1)) * 100; // percentil (100 = melhor)
  const color = pos <= 3 ? '#F59E0B' : pos <= Math.ceil(total / 3) ? '#1D9E75' : pos > total - Math.ceil(total / 3) ? '#D85A30' : '#185FA5';

  return (
    <div style={{
      background: '#fff', border: `2px solid ${color}`, borderRadius: 12,
      padding: '14px 20px', minWidth: 170, textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: 'Space Grotesk', lineHeight: 1 }}>
        {emoji && <span style={{ fontSize: 26, marginRight: 4 }}>{emoji}</span>}#{pos}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>de {total} assessores</div>
      <div style={{ marginTop: 8, height: 4, background: '#E2E7F0', borderRadius: 2 }}>
        <div style={{ height: 4, borderRadius: 2, background: color, width: `${pct}%` }} />
      </div>
      <div style={{ fontSize: 10, color, marginTop: 3, fontWeight: 600 }}>
        top {Math.max(1, Math.ceil(100 - pct))}%
      </div>
    </div>
  );
}

/* ── Cartão KPI individual ── */
function KCard({ label, value, sub, cor, icon }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 20px',
      borderLeft: `4px solid ${cor || 'var(--blue)'}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {icon && <i className={`ti ${icon}`} style={{ color: cor || 'var(--blue)', fontSize: 16 }} />}
        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Space Grotesk', color: 'var(--text1)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ── Barra de progresso com % ── */
function MetaBar({ real, meta, label, cor }) {
  const pct   = meta > 0 ? Math.min((real / meta) * 100, 150) : 0;
  const color = pct >= 100 ? '#1D9E75' : pct >= 80 ? '#F59E0B' : '#D85A30';
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{fmtPct(meta > 0 ? (real / meta) * 100 : 0)}</span>
      </div>
      <div style={{ height: 8, background: '#E2E7F0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: 8, width: `${pct}%`, background: color, borderRadius: 4, transition: 'width .4s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
        <span>Realizado: {cor === 'cap' ? fmtM(real) : fmtMCustodia(real)}</span>
        <span>Meta: {cor === 'cap' ? fmtM(meta) : fmtMCustodia(meta)}</span>
      </div>
    </div>
  );
}

export default function DashboardAssessor() {
  const assessores = getAssessores();
  const custodia   = getCustodia();
  const captacao   = getCaptacao();
  const metasCust  = getMetasCustodia();
  const metasCap   = getMetasCaptacao();

  const ativos = assessores.filter(a => a.ativo);
  const [codSel, setCodSel] = useState(ativos[0]?.cod || '');
  const [mes,    setMes]    = useState(new Date().getMonth());

  const assessor = ativos.find(a => a.cod === codSel);

  // ── Charts refs ──
  const custEvRef   = useRef(null); // evolução custódia
  const capMesRef   = useRef(null); // captação mensal
  const rankCustRef = useRef(null); // ranking custódia (horizontal)
  const rankCapRef  = useRef(null); // ranking captação acumulada
  const radarRef    = useRef(null); // radar multidimensional

  if (!assessor) return <div style={{ padding: 40, color: 'var(--text3)' }}>Nenhum assessor ativo encontrado.</div>;

  /* ════════ CÁLCULOS ════════ */

  // Custódia do assessor no mês
  const custMes    = custodia[codSel]?.[mes] || 0;
  const base2025   = CUSTODIA_FINAL_2025[codSel] || 0;
  const alvo2026   = base2025 * (1 + CRESCIMENTO_CUSTODIA_2026);
  const metaCustMes = base2025 + (alvo2026 - base2025) * (mes + 1) / 12;
  const pctCustMes  = metaCustMes > 0 ? (custMes / metaCustMes) * 100 : null;
  const crescCust   = base2025 > 0 ? ((custMes - base2025) / base2025) * 100 : null;

  // Captação acumulada Jan→mes
  const capAcum     = MESES.slice(0, mes + 1).reduce((s, __, i) => s + (captacao[codSel]?.[i] || 0), 0);
  const metaCapAcum = MESES.slice(0, mes + 1).reduce((s, __, i) => s + (metasCap[codSel]?.[i] || 0), 0);
  const pctCapAcum  = metaCapAcum !== 0 ? (capAcum / metaCapAcum) * 100 : null;
  const capAnual2025 = CAPTACAO_TOTAL_2025[codSel] || 0;
  const metaCapAnual = capAnual2025 * (1 + CRESCIMENTO_CAPTACAO_2026);

  // ── Rankings ──
  // Ranking custódia no mês (todos ativos)
  const rankingCust = [...ativos]
    .map(a => ({ cod: a.cod, nome: a.nome, cidade: a.cidade, v: custodia[a.cod]?.[mes] || 0 }))
    .sort((a, b) => b.v - a.v);
  const posCustGeral = rankingCust.findIndex(a => a.cod === codSel) + 1;

  // Ranking custódia na cidade
  const rankingCustCidade = rankingCust.filter(a => a.cidade === assessor.cidade);
  const posCustCidade = rankingCustCidade.findIndex(a => a.cod === codSel) + 1;

  // Ranking captação acumulada no mês
  const rankingCap = [...ativos]
    .map(a => ({
      cod: a.cod, nome: a.nome, cidade: a.cidade,
      v: MESES.slice(0, mes + 1).reduce((s, __, i) => s + (captacao[a.cod]?.[i] || 0), 0)
    }))
    .sort((a, b) => b.v - a.v);
  const posCapGeral  = rankingCap.findIndex(a => a.cod === codSel) + 1;
  const rankingCapCidade = rankingCap.filter(a => a.cidade === assessor.cidade);
  const posCapCidade = rankingCapCidade.findIndex(a => a.cod === codSel) + 1;

  // Médias do grupo
  const mediaCustMes = ativos.reduce((s, a) => s + (custodia[a.cod]?.[mes] || 0), 0) / ativos.length;
  const mediaCapAcum = rankingCap.reduce((s, a) => s + a.v, 0) / ativos.length;

  // Participação % na custódia total do grupo
  const totalCustGrupo = ativos.reduce((s, a) => s + (custodia[a.cod]?.[mes] || 0), 0);
  const partCust = totalCustGrupo > 0 ? (custMes / totalCustGrupo) * 100 : 0;

  // Métricas para Radar (normalizadas 0–100)
  const maxCust  = rankingCust[0]?.v  || 1;
  const maxCap   = Math.max(...rankingCap.map(a => Math.abs(a.v))) || 1;
  const maxMeta  = 100;
  const radarData = [
    { label: '% Meta\nCustódia', v: Math.min(pctCustMes || 0, 100) },
    { label: '% Meta\nCaptação', v: Math.min(pctCapAcum !== null ? Math.max(pctCapAcum, 0) : 0, 100) },
    { label: 'Volume\nCustódia',  v: (custMes / maxCust) * 100 },
    { label: 'Captação\nAcum.',   v: Math.max((capAcum / maxCap) * 100, 0) },
    { label: 'Rank\nGeral',       v: ((ativos.length - posCustGeral) / Math.max(ativos.length - 1, 1)) * 100 },
    { label: 'Crescim.\nvs 2025', v: Math.min(Math.max((crescCust || 0) + 50, 0), 100) },
  ];

  /* ════════ GRÁFICOS ════════ */

  // 1 — Evolução custódia do assessor vs média grupo vs meta mensal
  useChart(custEvRef, canvas => {
    const metaLine = MESES.map((_, i) => {
      const a = base2025 + (alvo2026 - base2025) * (i + 1) / 12;
      return a;
    });
    const mediaGrupo = MESES.map((_, i) =>
      ativos.reduce((s, a) => s + (custodia[a.cod]?.[i] || 0), 0) / ativos.length
    );
    const dados = MESES.map((_, i) => custodia[codSel]?.[i] || null);

    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: MESES,
        datasets: [
          {
            label: assessor.nome.split(' ')[0],
            data: dados,
            borderColor: COR_CIDADE[assessor.cidade],
            backgroundColor: `${COR_CIDADE[assessor.cidade]}22`,
            fill: true, tension: 0.3, borderWidth: 3, pointRadius: 5,
          },
          {
            label: 'Meta Mensal',
            data: metaLine,
            borderColor: '#F59E0B', backgroundColor: 'transparent',
            borderDash: [5, 3], tension: 0.3, borderWidth: 1.5, pointRadius: 2,
          },
          {
            label: 'Média Grupo',
            data: mediaGrupo,
            borderColor: '#94A3B8', backgroundColor: 'transparent',
            borderDash: [3, 3], tension: 0.3, borderWidth: 1.5, pointRadius: 2,
          },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          x: { grid: { color: '#E2E7F0' }, ticks: { font: { size: 11 } } },
          y: { grid: { color: '#E2E7F0' }, ticks: { font: { size: 11 },
            callback: v => `R$ ${(v/1e6).toFixed(0)}M` } }
        }
      }
    });
  }, [codSel, mes]);

  // 2 — Captação mensal do assessor vs meta mensal
  useChart(capMesRef, canvas => {
    const realMes = MESES.map((_, i) => i <= mes ? (captacao[codSel]?.[i] || 0) : null);
    const metaMes = MESES.map((_, i) => metasCap[codSel]?.[i] || 0);
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: MESES,
        datasets: [
          {
            label: 'Captação Realizada',
            data: realMes,
            backgroundColor: realMes.map(v => v === null ? 'transparent' : v >= 0 ? `${COR_CIDADE[assessor.cidade]}CC` : '#D85A30CC'),
            borderRadius: 5,
          },
          {
            label: 'Meta Mensal',
            data: metaMes,
            type: 'line',
            borderColor: '#F59E0B', backgroundColor: 'transparent',
            borderDash: [5, 3], borderWidth: 2, pointRadius: 3,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { grid: { color: '#E2E7F0' }, ticks: { font: { size: 11 },
            callback: v => Math.abs(v) >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : `R$ ${(v/1e3).toFixed(0)}k` } }
        }
      }
    });
  }, [codSel, mes]);

  // 3 — Ranking custódia todos (barras horizontais, assessor destacado)
  useChart(rankCustRef, canvas => {
    const labels = rankingCust.map(a => a.nome.split(' ').slice(0, 2).join(' '));
    const values = rankingCust.map(a => a.v);
    const colors = rankingCust.map(a =>
      a.cod === codSel ? COR_CIDADE[assessor.cidade] : `${COR_CIDADE[a.cidade]}55`
    );
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Custódia', data: values, backgroundColor: colors, borderRadius: 4 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${fmtMCustodia(ctx.raw)}` } }
        },
        scales: {
          x: { ticks: { font: { size: 10 }, callback: v => `R$ ${(v/1e6).toFixed(0)}M` }, grid: { color: '#E2E7F0' } },
          y: { ticks: { font: { size: 10 } }, grid: { display: false } }
        }
      }
    });
  }, [codSel, mes]);

  // 4 — Ranking captação acumulada (barras horizontais)
  useChart(rankCapRef, canvas => {
    const labels = rankingCap.map(a => a.nome.split(' ').slice(0, 2).join(' '));
    const values = rankingCap.map(a => a.v);
    const colors = rankingCap.map(a =>
      a.cod === codSel ? COR_CIDADE[assessor.cidade] :
        a.v >= 0 ? `${COR_CIDADE[a.cidade]}55` : '#D85A3044'
    );
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Captação Acum.', data: values, backgroundColor: colors, borderRadius: 4 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${fmtM(ctx.raw)}` } }
        },
        scales: {
          x: { ticks: { font: { size: 10 }, callback: v => Math.abs(v) >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : `R$ ${(v/1e3).toFixed(0)}k` }, grid: { color: '#E2E7F0' } },
          y: { ticks: { font: { size: 10 } }, grid: { display: false } }
        }
      }
    });
  }, [codSel, mes]);

  // 5 — Radar multidimensional
  useChart(radarRef, canvas => new Chart(canvas, {
    type: 'radar',
    data: {
      labels: radarData.map(d => d.label),
      datasets: [
        {
          label: assessor.nome.split(' ')[0],
          data: radarData.map(d => d.v),
          borderColor: COR_CIDADE[assessor.cidade],
          backgroundColor: `${COR_CIDADE[assessor.cidade]}33`,
          pointBackgroundColor: COR_CIDADE[assessor.cidade],
          borderWidth: 2, pointRadius: 4,
        },
        {
          label: 'Referência (100%)',
          data: radarData.map(() => 100),
          borderColor: '#CBD5E1', backgroundColor: 'transparent',
          borderDash: [4, 3], borderWidth: 1, pointRadius: 0,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false },
          grid: { color: '#E2E7F0' },
          pointLabels: { font: { size: 10 } },
        }
      }
    }
  }), [codSel, mes]);

  /* ════════ RENDER ════════ */
  return (
    <>
      {/* ── Seletor de assessor + mês ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Card do assessor selecionado */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '16px 20px',
          border: `2px solid ${COR_CIDADE[assessor.cidade]}`,
          display: 'flex', alignItems: 'center', gap: 16, flex: '0 0 auto',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', background: COR_CIDADE[assessor.cidade],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 18,
          }}>{iniciais(assessor.nome)}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{assessor.nome}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <span className="cidade-pill" style={{ background: COR_BG[assessor.cidade], color: COR_CIDADE[assessor.cidade], fontSize: 11 }}>
                {CIDADES[assessor.cidade]}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{assessor.cod}</span>
            </div>
          </div>
        </div>

        {/* Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>ASSESSOR</label>
          <select
            value={codSel}
            onChange={e => setCodSel(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, minWidth: 260 }}
          >
            {Object.entries(CIDADES).map(([c, nomeCidade]) => (
              <optgroup key={c} label={nomeCidade}>
                {ativos.filter(a => a.cidade === c).map(a => (
                  <option key={a.cod} value={a.cod}>{a.nome}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Seletor de mês */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>MÊS DE REFERÊNCIA</label>
          <div className="toggle-group">
            {MESES.map((m, i) => (
              <button key={i} className={`toggle-btn ${mes === i ? 'active' : ''}`} onClick={() => setMes(i)}>{m}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Rankings (posição no grupo) ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
          Posição no Grupo — {MESES_FULL[mes]}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <RankBadge pos={posCustGeral}  total={ativos.length}               label={`Custódia — Geral`} />
          <RankBadge pos={posCustCidade} total={rankingCustCidade.length}    label={`Custódia — ${CIDADES[assessor.cidade]}`} />
          <RankBadge pos={posCapGeral}   total={ativos.length}               label={`Captação Acum. — Geral`} />
          <RankBadge pos={posCapCidade}  total={rankingCapCidade.length}     label={`Captação Acum. — ${CIDADES[assessor.cidade]}`} />
        </div>
      </div>

      {/* ── KPIs individuais ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KCard
          icon="ti-building-bank"
          label={`Custódia — ${MESES_FULL[mes]}`}
          value={fmtMCustodia(custMes)}
          sub={`base Dez/2025: ${fmtMCustodia(base2025)}`}
          cor={COR_CIDADE[assessor.cidade]}
        />
        <KCard
          icon="ti-target"
          label="% Meta Custódia (mês)"
          value={pctCustMes !== null ? fmtPct(pctCustMes) : '—'}
          sub={`meta: ${fmtMCustodia(metaCustMes)}`}
          cor={pctCustMes === null ? '#94A3B8' : pctCustMes >= 100 ? '#1D9E75' : pctCustMes >= 80 ? '#F59E0B' : '#D85A30'}
        />
        <KCard
          icon="ti-chart-line"
          label="Crescimento vs Dez/2025"
          value={crescCust !== null ? fmtPct(crescCust) : '—'}
          sub="variação de carteira"
          cor={crescCust !== null ? (crescCust >= 0 ? '#1D9E75' : '#D85A30') : '#94A3B8'}
        />
        <KCard
          icon="ti-pie-chart"
          label="Participação no Grupo"
          value={fmtPct(partCust)}
          sub={`grupo total: ${fmtMCustodia(totalCustGrupo)}`}
          cor={COR_CIDADE[assessor.cidade]}
        />
        <KCard
          icon="ti-trending-up"
          label={`Captação Acum. Jan–${MESES[mes]}`}
          value={fmtM(capAcum)}
          sub={`meta: ${fmtM(metaCapAcum)}`}
          cor={capAcum >= 0 ? '#1D9E75' : '#D85A30'}
        />
        <KCard
          icon="ti-target"
          label="% Meta Captação Acum."
          value={pctCapAcum !== null ? fmtPct(pctCapAcum) : '—'}
          sub={`base 2025: ${fmtM(capAnual2025)}`}
          cor={pctCapAcum === null ? '#94A3B8' : pctCapAcum >= 100 ? '#1D9E75' : pctCapAcum >= 80 ? '#F59E0B' : '#D85A30'}
        />
        <KCard
          icon="ti-flag"
          label="Alvo Custódia Dez/2026"
          value={fmtMCustodia(alvo2026)}
          sub={`crescer +${fmtMCustodia(alvo2026 - base2025)}`}
          cor="#7F77DD"
        />
        <KCard
          icon="ti-flag"
          label="Alvo Captação Anual 2026"
          value={fmtM(metaCapAnual)}
          sub={`+25% sobre 2025`}
          cor="#7F77DD"
        />
      </div>

      {/* ── Barras de progresso das metas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="table-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: 'var(--text2)' }}>
            <i className="ti ti-building-bank" style={{ marginRight: 6, color: 'var(--blue)' }} />
            Progresso Custódia 2026
          </div>
          <MetaBar real={custMes} meta={metaCustMes} label={`Meta ${MESES_FULL[mes]}`} />
          <MetaBar real={custMes} meta={alvo2026}    label="Meta Dez/2026 (anual)" />
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text3)' }}>vs Média do grupo</span>
              <span style={{ fontWeight: 700, color: custMes >= mediaCustMes ? '#1D9E75' : '#D85A30' }}>
                {fmtM(custMes - mediaCustMes)} {custMes >= mediaCustMes ? '▲' : '▼'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              Média grupo: {fmtMCustodia(mediaCustMes)}
            </div>
          </div>
        </div>

        <div className="table-card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: 'var(--text2)' }}>
            <i className="ti ti-trending-up" style={{ marginRight: 6, color: 'var(--green)' }} />
            Progresso Captação 2026
          </div>
          <MetaBar real={capAcum} meta={metaCapAcum} label={`Meta Acum. Jan–${MESES[mes]}`} cor="cap" />
          <MetaBar real={capAcum} meta={metaCapAnual} label="Meta Anual 2026" cor="cap" />
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--text3)' }}>vs Média do grupo</span>
              <span style={{ fontWeight: 700, color: capAcum >= mediaCapAcum ? '#1D9E75' : '#D85A30' }}>
                {fmtM(capAcum - mediaCapAcum)} {capAcum >= mediaCapAcum ? '▲' : '▼'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              Média grupo: {fmtM(mediaCapAcum)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Radar multidimensional ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="chart-card">
          <div className="chart-title">Perfil Multidimensional — {assessor.nome.split(' ')[0]}</div>
          <div className="chart-wrap" style={{ height: 300 }}><canvas ref={radarRef} /></div>
        </div>

        {/* Tabela mês a mês resumida */}
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">Resumo Mensal — Custódia</span>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 320 }}>
            <table>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th style={{ textAlign: 'right' }}>Custódia</th>
                  <th style={{ textAlign: 'right' }}>Meta</th>
                  <th style={{ textAlign: 'right' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {MESES.map((m, i) => {
                  const r = custodia[codSel]?.[i] || 0;
                  const mt = base2025 + (alvo2026 - base2025) * (i + 1) / 12;
                  const p  = mt > 0 ? (r / mt) * 100 : null;
                  const isHoje = i === mes;
                  return (
                    <tr key={i} style={{ background: isHoje ? '#EEF3FC' : undefined, opacity: i > mes ? 0.4 : 1 }}>
                      <td style={{ fontWeight: isHoje ? 700 : 400, color: isHoje ? 'var(--blue)' : undefined }}>
                        {m}{isHoje ? ' ◀' : ''}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 12 }}>
                        {r ? fmtMCustodia(r) : <span style={{ color: '#C8CFE0' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text3)' }}>
                        {fmtMCustodia(mt)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12,
                        color: p === null ? '#C8CFE0' : p >= 100 ? '#1D9E75' : p >= 80 ? '#F59E0B' : '#D85A30' }}>
                        {p !== null && r ? fmtPct(p) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Gráficos evolução custódia + captação mensal ── */}
      <div className="charts-row" style={{ marginBottom: 20 }}>
        <div className="chart-card">
          <div className="chart-title">Evolução Custódia — {assessor.nome.split(' ')[0]} vs Meta vs Média Grupo</div>
          <div className="chart-wrap"><canvas ref={custEvRef} /></div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Captação Mensal — Realizado vs Meta</div>
          <div className="chart-wrap"><canvas ref={capMesRef} /></div>
        </div>
      </div>

      {/* ── Rankings visuais ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="chart-card">
          <div className="chart-title">
            Ranking Custódia — {MESES_FULL[mes]}
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: COR_CIDADE[assessor.cidade] }}>
              ■ {assessor.nome.split(' ')[0]} (#{posCustGeral})
            </span>
          </div>
          <div className="chart-wrap" style={{ height: Math.max(300, ativos.length * 22) }}>
            <canvas ref={rankCustRef} />
          </div>
        </div>
        <div className="chart-card">
          <div className="chart-title">
            Ranking Captação Acum. Jan–{MESES[mes]}
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: COR_CIDADE[assessor.cidade] }}>
              ■ {assessor.nome.split(' ')[0]} (#{posCapGeral})
            </span>
          </div>
          <div className="chart-wrap" style={{ height: Math.max(300, ativos.length * 22) }}>
            <canvas ref={rankCapRef} />
          </div>
        </div>
      </div>

      {/* ── Tabela comparativa na cidade ── */}
      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">
            <span style={{ background: COR_BG[assessor.cidade], color: COR_CIDADE[assessor.cidade], padding: '2px 10px', borderRadius: 6, marginRight: 8, fontWeight: 700 }}>
              {CIDADES[assessor.cidade]}
            </span>
            Comparativo de Colegas — {MESES_FULL[mes]}
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Assessor</th>
              <th style={{ textAlign: 'right' }}>Custódia</th>
              <th style={{ textAlign: 'right' }}>% Meta Cust.</th>
              <th style={{ textAlign: 'right' }}>Captação Acum.</th>
              <th style={{ textAlign: 'right' }}>% Meta Cap.</th>
            </tr>
          </thead>
          <tbody>
            {rankingCustCidade.map((a, idx) => {
              const isEu  = a.cod === codSel;
              const cReal = a.v;
              const cMeta = (CUSTODIA_FINAL_2025[a.cod] || 0) + ((CUSTODIA_FINAL_2025[a.cod] || 0) * CRESCIMENTO_CUSTODIA_2026 * (mes + 1) / 12);
              const cPct  = cMeta > 0 ? (cReal / cMeta) * 100 : null;
              const capA  = rankingCap.find(x => x.cod === a.cod)?.v || 0;
              const capMt = MESES.slice(0, mes + 1).reduce((s, __, i) => s + (metasCap[a.cod]?.[i] || 0), 0);
              const capPct = capMt !== 0 ? (capA / capMt) * 100 : null;
              return (
                <tr key={a.cod} style={{
                  background: isEu ? `${COR_CIDADE[assessor.cidade]}11` : undefined,
                  fontWeight: isEu ? 700 : 400,
                  borderLeft: isEu ? `3px solid ${COR_CIDADE[assessor.cidade]}` : '3px solid transparent',
                }}>
                  <td style={{ color: 'var(--text3)', width: 32 }}>{idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar" style={{ background: COR_CIDADE[a.cidade], width: 28, height: 28, fontSize: 11 }}>
                        {iniciais(a.nome)}
                      </div>
                      <span style={{ fontSize: 13 }}>{a.nome}</span>
                      {isEu && <span style={{ fontSize: 10, background: COR_CIDADE[assessor.cidade], color: '#fff', borderRadius: 4, padding: '1px 6px' }}>você</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 12 }}>{fmtMCustodia(cReal)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: cPct !== null ? (cPct >= 100 ? '#1D9E75' : cPct >= 80 ? '#F59E0B' : '#D85A30') : '#C8CFE0' }}>
                    {cPct !== null ? fmtPct(cPct) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 12 }}>
                    <span className={capA >= 0 ? 'val-pos' : 'val-neg'}>{fmtM(capA)}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: capPct !== null ? (capPct >= 100 ? '#1D9E75' : capPct >= 80 ? '#F59E0B' : '#D85A30') : '#C8CFE0' }}>
                    {capPct !== null ? fmtPct(capPct) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
