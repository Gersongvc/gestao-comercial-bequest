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

/* ── helpers ── */
function Sparkline({ data, color }) {
  const w = 80, h = 28;
  const valid = data.filter(v => v > 0);
  if (valid.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...valid), max = Math.max(...valid);
  const range = max - min || 1;
  const pts = valid.map((v, i) => {
    const x = (i / (valid.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} className="sparkline">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({ label, value, sub, variant, icon }) {
  return (
    <div className={`kpi-card ${variant || ''}`}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 20, marginBottom: 4, opacity: 0.6 }} />}
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize: typeof value === 'string' && value.length > 12 ? 16 : undefined }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function useChart(ref, builder, deps) {
  const inst = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (inst.current) inst.current.destroy();
    inst.current = builder(ref.current);
    return () => inst.current?.destroy();
  }, deps);
}

const barLabelPlugin = {
  id: 'barTopLabels',
  afterDatasetsDraw(chart) {
    const { ctx, data } = chart;
    const meta = chart.getDatasetMeta(0);
    ctx.save();
    ctx.font = 'bold 11px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    meta.data.forEach((bar, i) => {
      const v = data.datasets[0].data[i];
      if (!v) return;
      const label = Math.abs(v) >= 1e9
        ? `R$ ${(v / 1e9).toFixed(2)}B`
        : `R$ ${(v / 1e6).toFixed(1)}M`;
      ctx.fillStyle = Array.isArray(data.datasets[0].backgroundColor)
        ? data.datasets[0].backgroundColor[i]
        : data.datasets[0].backgroundColor;
      ctx.fillText(label, bar.x, bar.y - 4);
    });
    ctx.restore();
  }
};

/* ════════════════════════════════════════════════════
   ABA CUSTÓDIA
════════════════════════════════════════════════════ */
function TabCustodia({ assessores, custodia, metasCust, mes, setMes, periodo }) {
  const lineRef  = useRef(null);
  const barRef   = useRef(null);
  const atingRef = useRef(null);

  const ativos = assessores.filter(a => a.ativo);

  const totalCustodiaMes = ativos.reduce((s, a) => s + (custodia[a.cod]?.[mes] || 0), 0);
  const custPorCidade    = Object.fromEntries(
    Object.keys(CIDADES).map(c => [c,
      ativos.filter(a => a.cidade === c).reduce((s, a) => s + (custodia[a.cod]?.[mes] || 0), 0)
    ])
  );

  // Meta custódia linear no mês: interpola Dez/2025 → Dez/2026
  const metaMes = cod => {
    const base = CUSTODIA_FINAL_2025[cod] || 0;
    const alvo = base * (1 + CRESCIMENTO_CUSTODIA_2026);
    return base + (alvo - base) * (mes + 1) / 12;
  };
  const totalMetaMes = ativos.reduce((s, a) => s + metaMes(a.cod), 0);
  const pctMetaMes   = totalMetaMes > 0 ? (totalCustodiaMes / totalMetaMes) * 100 : null;

  // KPIs extras
  const totalBase2025 = ativos.reduce((s, a) => s + (CUSTODIA_FINAL_2025[a.cod] || 0), 0);
  const totalAlvo2026 = totalBase2025 * (1 + CRESCIMENTO_CUSTODIA_2026);
  const crescimento   = totalBase2025 > 0 ? ((totalCustodiaMes - totalBase2025) / totalBase2025) * 100 : null;

  const top5 = [...ativos]
    .sort((a, b) => (custodia[b.cod]?.[mes] || 0) - (custodia[a.cod]?.[mes] || 0))
    .slice(0, 5);

  // Slots para o gráfico de linha (ano atual ou rolling 12m)
  const mesAtualDash = new Date().getMonth();
  const slots12 = periodo === 'ult12'
    ? Array.from({ length: 12 }, (_, k) => {
        const offset = k - 11;
        const mesIdx = ((mesAtualDash + offset) % 12 + 12) % 12;
        const ano    = mesAtualDash + offset < 0 ? 2025 : 2026;
        return { label: `${MESES[mesIdx]}/${String(ano).slice(2)}`, ano, mes: mesIdx };
      })
    : MESES.map((m, i) => ({ label: m, ano: 2026, mes: i }));

  // Gráfico 1 — linha por cidade
  useChart(lineRef, canvas => new Chart(canvas, {
    type: 'line',
    data: {
      labels: slots12.map(s => s.label),
      datasets: Object.keys(CIDADES).map(c => ({
        label: CIDADES[c],
        data: slots12.map(s => {
          if (s.ano === 2025) return ativos.filter(a => a.cidade === c).reduce((sum, a) => sum + (CUSTODIA_FINAL_2025[a.cod] || 0), 0);
          return ativos.filter(a => a.cidade === c).reduce((sum, a) => sum + (custodia[a.cod]?.[s.mes] || 0), 0);
        }),
        borderColor: COR_CIDADE[c], backgroundColor: 'transparent',
        tension: 0.4, pointRadius: 3, borderWidth: 2,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        x: { grid: { color: '#E2E7F0' }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#E2E7F0' }, ticks: { font: { size: 11 },
          callback: v => v >= 1e9 ? `R$ ${(v/1e9).toFixed(1)}B` : `R$ ${(v/1e6).toFixed(0)}M` } }
      }
    }
  }), [periodo]);

  // Gráfico 2 — barras por cidade no mês (com rótulo no topo)
  useChart(barRef, canvas => new Chart(canvas, {
    type: 'bar',
    data: {
      labels: Object.values(CIDADES),
      datasets: [{
        label: MESES[mes],
        data: Object.keys(CIDADES).map(c => custPorCidade[c]),
        backgroundColor: Object.keys(CIDADES).map(c => COR_CIDADE[c]),
        borderRadius: 6, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 28 } },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: '#E2E7F0' }, ticks: { font: { size: 11 },
          callback: v => `R$ ${(v/1e6).toFixed(0)}M` } }
      }
    },
    plugins: [barLabelPlugin]
  }), [mes]);

  // Gráfico 3 — % atingimento da meta 2026 por assessor (barras horizontais)
  const assessAtingimento = [...ativos]
    .map(a => ({
      nome: a.nome.split(' ').slice(0, 2).join(' '),
      real: custodia[a.cod]?.[mes] || 0,
      meta: metaMes(a.cod),
      pct:  metaMes(a.cod) > 0 ? ((custodia[a.cod]?.[mes] || 0) / metaMes(a.cod)) * 100 : 0,
      cor:  COR_CIDADE[a.cidade],
    }))
    .filter(a => a.meta > 0)
    .sort((a, b) => b.pct - a.pct);

  useChart(atingRef, canvas => new Chart(canvas, {
    type: 'bar',
    data: {
      labels: assessAtingimento.map(a => a.nome),
      datasets: [{
        label: '% Meta Custódia',
        data: assessAtingimento.map(a => Math.min(a.pct, 150)),
        backgroundColor: assessAtingimento.map(a =>
          a.pct >= 100 ? '#1D9E75' : a.pct >= 80 ? '#F59E0B' : '#D85A30'
        ),
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 50 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const a = assessAtingimento[ctx.dataIndex];
              return ` ${fmtPct(a.pct)} — ${fmtMCustodia(a.real)} / ${fmtMCustodia(a.meta)}`;
            }
          }
        }
      },
      scales: {
        x: {
          min: 0, max: 150,
          ticks: { callback: v => `${v}%`, font: { size: 10 } },
          grid: { color: '#E2E7F0' }
        },
        y: { ticks: { font: { size: 10 } }, grid: { display: false } }
      }
    },
    plugins: [{
      id: 'pctLabels',
      afterDatasetsDraw(chart) {
        const { ctx } = chart;
        chart.getDatasetMeta(0).data.forEach((bar, i) => {
          const a = assessAtingimento[i];
          ctx.save();
          ctx.font = 'bold 10px "Space Grotesk", sans-serif';
          ctx.fillStyle = a.pct >= 100 ? '#1D9E75' : a.pct >= 80 ? '#D97706' : '#D85A30';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${a.pct.toFixed(1)}%`, bar.x + 4, bar.y);
          ctx.restore();
        });
      }
    }]
  }), [mes]);

  return (
    <>
      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard
          icon="ti-building-bank"
          label={`Custódia Total — ${MESES_FULL[mes]}`}
          value={fmtMCustodia(totalCustodiaMes)}
          sub={`base Dez/2025: ${fmtMCustodia(totalBase2025)}`}
        />
        <KpiCard
          icon="ti-target"
          label="% Meta Custódia 2026"
          value={pctMetaMes !== null ? fmtPct(pctMetaMes) : '—'}
          sub={`alvo ${MESES_FULL[mes]}: ${fmtMCustodia(totalMetaMes)}`}
          variant={pctMetaMes === null ? '' : pctMetaMes >= 100 ? 'positive' : pctMetaMes >= 80 ? '' : 'negative'}
        />
        <KpiCard
          icon="ti-chart-line"
          label="Crescimento vs Dez/2025"
          value={crescimento !== null ? fmtPct(crescimento) : '—'}
          sub="variação sobre base 2025"
          variant={crescimento !== null ? (crescimento >= 0 ? 'positive' : 'negative') : ''}
        />
        <KpiCard
          icon="ti-flag"
          label="Alvo Dez/2026"
          value={fmtMCustodia(totalAlvo2026)}
          sub="+21% sobre posição final 2025"
        />
      </div>

      {/* Gráficos linha + barra */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">Evolução Custódia por Cidade</div>
          <div className="chart-wrap"><canvas ref={lineRef} /></div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Custódia por Cidade — {MESES_FULL[mes]}</div>
          <div className="chart-wrap"><canvas ref={barRef} /></div>
        </div>
      </div>

      {/* Gráfico % atingimento */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="chart-title">
          % Atingimento Meta Custódia por Assessor — {MESES_FULL[mes]}
          <span style={{ marginLeft: 12, fontSize: 11, fontWeight: 400, color: 'var(--text3)' }}>
            <span style={{ color: '#1D9E75', marginRight: 8 }}>■ ≥100%</span>
            <span style={{ color: '#F59E0B', marginRight: 8 }}>■ 80–99%</span>
            <span style={{ color: '#D85A30' }}>■ &lt;80%</span>
          </span>
        </div>
        <div className="chart-wrap" style={{ height: Math.max(260, assessAtingimento.length * 26) }}>
          <canvas ref={atingRef} />
        </div>
      </div>

      {/* Top 5 */}
      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">
            <i className="ti ti-building-bank" style={{ marginRight: 6, color: 'var(--blue)' }} />
            Top 5 — Custódia {MESES_FULL[mes]}
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Assessor</th><th>Cidade</th>
              <th style={{ textAlign: 'right' }}>Custódia</th>
              <th style={{ textAlign: 'right' }}>Meta Mês</th>
              <th style={{ textAlign: 'right' }}>% Meta</th>
              <th>Tendência</th>
            </tr>
          </thead>
          <tbody>
            {top5.map((a, idx) => {
              const real = custodia[a.cod]?.[mes] || 0;
              const meta = metaMes(a.cod);
              const pct  = meta > 0 ? (real / meta) * 100 : null;
              return (
                <tr key={a.cod}>
                  <td style={{ fontWeight: 700, color: 'var(--text3)', width: 32 }}>{idx + 1}</td>
                  <td>
                    <div className="assessor-cell">
                      <div className="avatar" style={{ background: COR_CIDADE[a.cidade] }}>{iniciais(a.nome)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.cod}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="cidade-pill" style={{ background: COR_BG[a.cidade], color: COR_CIDADE[a.cidade] }}>{a.cidade}</span></td>
                  <td style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontWeight: 600 }}>{fmtMCustodia(real)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text3)', fontSize: 12 }}>{fmtMCustodia(meta)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {pct !== null
                      ? <span style={{ fontWeight: 700, color: pct >= 100 ? 'var(--green)' : pct >= 80 ? 'var(--amber)' : 'var(--red)' }}>{fmtPct(pct)}</span>
                      : '—'}
                  </td>
                  <td><Sparkline data={custodia[a.cod] || []} color={COR_CIDADE[a.cidade]} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════
   ABA CAPTAÇÃO
════════════════════════════════════════════════════ */
function TabCaptacao({ assessores, captacao, metasCap, mes, setMes, periodo }) {
  const barCidRef  = useRef(null);
  const acumRef    = useRef(null);
  const saldoRef   = useRef(null);

  const ativos = assessores.filter(a => a.ativo);

  // Captação do mês por cidade
  const capPorCidade = Object.fromEntries(
    Object.keys(CIDADES).map(c => [c,
      ativos.filter(a => a.cidade === c).reduce((s, a) => s + (captacao[a.cod]?.[mes] || 0), 0)
    ])
  );

  // Slots para os gráficos de série temporal (ano atual ou rolling 12m)
  const mesAtualDash = new Date().getMonth();
  const slotsC = periodo === 'ult12'
    ? Array.from({ length: 12 }, (_, k) => {
        const offset = k - 11;
        const mesIdx = ((mesAtualDash + offset) % 12 + 12) % 12;
        const ano    = mesAtualDash + offset < 0 ? 2025 : 2026;
        return { label: `${MESES[mesIdx]}/${String(ano).slice(2)}`, ano, mes: mesIdx };
      })
    : MESES.map((m, i) => ({ label: m, ano: 2026, mes: i }));

  // Captação acumulada para gráfico (respeita slots e período)
  let _acumR = 0, _acumM = 0;
  const acumReal = slotsC.map(s => {
    if (s.ano === 2025) return null;
    if (s.mes > mes) return null;
    _acumR += ativos.reduce((ss, a) => ss + (captacao[a.cod]?.[s.mes] || 0), 0);
    return _acumR;
  });
  const acumMeta = slotsC.map(s => {
    if (s.ano === 2025) return 0;
    _acumM += ativos.reduce((ss, a) => ss + (metasCap[a.cod]?.[s.mes] || 0), 0);
    return _acumM;
  });

  // Saldo mensal por slot
  const saldoMensal = slotsC.map(s => {
    if (s.ano === 2025) return null;
    if (s.mes > mes) return null;
    const real = ativos.reduce((ss, a) => ss + (captacao[a.cod]?.[s.mes] || 0), 0);
    const meta = ativos.reduce((ss, a) => ss + (metasCap[a.cod]?.[s.mes] || 0), 0);
    return real - meta;
  });

  // KPIs (sempre baseados no ano atual, independente de período)
  const capMesTotal   = ativos.reduce((s, a) => s + (captacao[a.cod]?.[mes] || 0), 0);
  const capAcumTotal  = ativos.reduce((s, a) =>
    s + MESES.slice(0, mes + 1).reduce((ss, __, j) => ss + (captacao[a.cod]?.[j] || 0), 0), 0);
  const metaAcumTotal = ativos.reduce((s, a) =>
    s + MESES.slice(0, mes + 1).reduce((ss, __, j) => ss + (metasCap[a.cod]?.[j] || 0), 0), 0);
  const pctAcum       = metaAcumTotal !== 0 ? (capAcumTotal / metaAcumTotal) * 100 : null;
  const metaAnualTotal = ativos.reduce((s, a) =>
    s + (metasCap[a.cod] || []).reduce((ss, v) => ss + v, 0), 0);

  // Top 5 captação acumulada Jan→mes
  const top5Cap = [...ativos]
    .map(a => ({
      ...a,
      totalCap: MESES.slice(0, mes + 1).reduce((s, __, i) => s + (captacao[a.cod]?.[i] || 0), 0),
      totalMeta: MESES.slice(0, mes + 1).reduce((s, __, i) => s + (metasCap[a.cod]?.[i] || 0), 0),
    }))
    .sort((a, b) => b.totalCap - a.totalCap)
    .slice(0, 5);

  // Gráfico 1 — captação mensal por cidade (barras empilhadas)
  useChart(barCidRef, canvas => new Chart(canvas, {
    type: 'bar',
    data: {
      labels: slotsC.map(s => s.label),
      datasets: Object.keys(CIDADES).map(c => ({
        label: CIDADES[c],
        data: slotsC.map(s => {
          if (s.ano === 2025) return null;
          if (s.mes > mes) return null;
          return ativos.filter(a => a.cidade === c).reduce((ss, a) => ss + (captacao[a.cod]?.[s.mes] || 0), 0);
        }),
        backgroundColor: COR_CIDADE[c], borderRadius: 2,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          stacked: true, grid: { color: '#E2E7F0' },
          ticks: { font: { size: 11 },
            callback: v => Math.abs(v) >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : `R$ ${(v/1e3).toFixed(0)}k` }
        }
      }
    }
  }), [mes, periodo]);

  // Gráfico 2 — captação acumulada vs meta acumulada
  useChart(acumRef, canvas => new Chart(canvas, {
    type: 'line',
    data: {
      labels: slotsC.map(s => s.label),
      datasets: [
        {
          label: 'Realizado Acum.',
          data: acumReal,
          borderColor: '#185FA5', backgroundColor: 'rgba(24,95,165,0.08)',
          fill: true, tension: 0.3, borderWidth: 2.5, pointRadius: 4,
        },
        {
          label: 'Meta Acum.',
          data: acumMeta,
          borderColor: '#F59E0B', backgroundColor: 'transparent',
          borderDash: [6, 3], tension: 0.3, borderWidth: 2, pointRadius: 3,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      scales: {
        x: { grid: { color: '#E2E7F0' }, ticks: { font: { size: 11 } } },
        y: {
          grid: { color: '#E2E7F0' },
          ticks: { font: { size: 11 },
            callback: v => Math.abs(v) >= 1e6 ? `R$ ${(v/1e6).toFixed(1)}M` : `R$ ${(v/1e3).toFixed(0)}k` }
        }
      }
    }
  }), [mes, periodo]);

  // Gráfico 3 — saldo mensal (realizado - meta), barra verde/vermelho
  useChart(saldoRef, canvas => new Chart(canvas, {
    type: 'bar',
    data: {
      labels: slotsC.map(s => s.label),
      datasets: [{
        label: 'Saldo (Realizado − Meta)',
        data: saldoMensal,
        backgroundColor: saldoMensal.map(v => v === null ? 'transparent' : v >= 0 ? '#1D9E75' : '#D85A30'),
        borderRadius: 5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          grid: { color: '#E2E7F0' },
          ticks: { font: { size: 11 },
            callback: v => Math.abs(v) >= 1e6
              ? `${v >= 0 ? '+' : '−'}R$ ${(Math.abs(v)/1e6).toFixed(1)}M`
              : `${v >= 0 ? '+' : '−'}R$ ${(Math.abs(v)/1e3).toFixed(0)}k` }
        }
      }
    }
  }), [mes, periodo]);

  return (
    <>
      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard
          icon="ti-trending-up"
          label={`Captação — ${MESES_FULL[mes]}`}
          value={fmtM(capMesTotal)}
          sub="líquido no mês"
          variant={capMesTotal >= 0 ? 'positive' : 'negative'}
        />
        <KpiCard
          icon="ti-stack"
          label={`Captação Acum. Jan–${MESES[mes]}`}
          value={fmtM(capAcumTotal)}
          sub={`meta acum.: ${fmtM(metaAcumTotal)}`}
          variant={capAcumTotal >= 0 ? 'positive' : 'negative'}
        />
        <KpiCard
          icon="ti-target"
          label="% Meta Acumulada"
          value={pctAcum !== null ? fmtPct(pctAcum) : '—'}
          sub={`Jan–${MESES[mes]}`}
          variant={pctAcum === null ? '' : pctAcum >= 100 ? 'positive' : pctAcum >= 80 ? '' : 'negative'}
        />
        <KpiCard
          icon="ti-flag"
          label="Meta Anual Captação 2026"
          value={fmtM(metaAnualTotal)}
          sub="+25% sobre captação 2025"
        />
      </div>

      {/* Gráficos */}
      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-title">Captação Mensal por Cidade (empilhada)</div>
          <div className="chart-wrap"><canvas ref={barCidRef} /></div>
        </div>
        <div className="chart-card">
          <div className="chart-title">Captação Acumulada — Realizado vs Meta</div>
          <div className="chart-wrap"><canvas ref={acumRef} /></div>
        </div>
      </div>

      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="chart-title">Saldo Mensal — Realizado menos Meta de Captação</div>
        <div className="chart-wrap"><canvas ref={saldoRef} /></div>
      </div>

      {/* Top 5 */}
      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">
            <i className="ti ti-trending-up" style={{ marginRight: 6, color: 'var(--green)' }} />
            Top 5 — Captação Acum. Jan–{MESES[mes]}
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Assessor</th><th>Cidade</th>
              <th style={{ textAlign: 'right' }}>Captação Acum.</th>
              <th style={{ textAlign: 'right' }}>Meta Acum.</th>
              <th style={{ textAlign: 'right' }}>Saldo</th>
              <th>Tendência</th>
            </tr>
          </thead>
          <tbody>
            {top5Cap.map((a, idx) => {
              const saldo = a.totalCap - a.totalMeta;
              return (
                <tr key={a.cod}>
                  <td style={{ fontWeight: 700, color: 'var(--text3)', width: 32 }}>{idx + 1}</td>
                  <td>
                    <div className="assessor-cell">
                      <div className="avatar" style={{ background: COR_CIDADE[a.cidade] }}>{iniciais(a.nome)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.nome}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.cod}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="cidade-pill" style={{ background: COR_BG[a.cidade], color: COR_CIDADE[a.cidade] }}>{a.cidade}</span></td>
                  <td style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontWeight: 600 }}>
                    <span className={a.totalCap >= 0 ? 'val-pos' : 'val-neg'}>{fmtM(a.totalCap)}</span>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text3)', fontSize: 12 }}>{fmtM(a.totalMeta)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontWeight: 700 }}>
                    <span style={{ color: saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtM(saldo)}</span>
                  </td>
                  <td>
                    <Sparkline
                      data={(captacao[a.cod] || []).map(v => Math.max(v, 0))}
                      color={COR_CIDADE[a.cidade]}
                    />
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

/* ════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [aba, setAba]     = useState('custodia');
  const [mes, setMes]     = useState(new Date().getMonth());
  const [periodo, setPeriodo] = useState('ano'); // 'ano' | 'ult12'

  const assessores = getAssessores();
  const custodia   = getCustodia();
  const captacao   = getCaptacao();
  const metasCust  = getMetasCustodia();
  const metasCap   = getMetasCaptacao();

  return (
    <>
      {/* Seletor de mês + abas no mesmo bar */}
      <div className="filters-bar" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${aba === 'custodia' ? 'active' : ''}`}
            onClick={() => setAba('custodia')}
          >
            <i className="ti ti-building-bank" style={{ marginRight: 6 }} />Custódia
          </button>
          <button
            className={`toggle-btn ${aba === 'captacao' ? 'active' : ''}`}
            onClick={() => setAba('captacao')}
          >
            <i className="ti ti-trending-up" style={{ marginRight: 6 }} />Captação
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>Mês:</label>
          <div className="toggle-group">
            {MESES.map((m, i) => (
              <button
                key={i}
                onClick={() => setMes(i)}
                className={`toggle-btn ${mes === i ? 'active' : ''}`}
              >{m}</button>
            ))}
          </div>
        </div>

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
      </div>

      {aba === 'custodia' && (
        <TabCustodia
          assessores={assessores}
          custodia={custodia}
          metasCust={metasCust}
          mes={mes}
          setMes={setMes}
          periodo={periodo}
        />
      )}
      {aba === 'captacao' && (
        <TabCaptacao
          assessores={assessores}
          captacao={captacao}
          metasCap={metasCap}
          mes={mes}
          setMes={setMes}
          periodo={periodo}
        />
      )}
    </>
  );
}
