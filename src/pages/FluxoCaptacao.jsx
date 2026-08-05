import { useEffect, useRef } from 'react';
import { useState } from 'react';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  MESES, CIDADES, COR_CIDADE, COR_BG,
  APORTE_INICIAL, RESGATE_INICIAL, CAPTACAO_INICIAL,
} from '../data/dados';
import { getAssessores } from '../data/store';
import { fmtM, iniciais } from '../utils/fmt';

Chart.register(...registerables, ChartDataLabels);

const MESES_DISP = MESES.slice(0, 7); // Jan–Jul

const DS_CFG = {
  aporte:  { label: 'Aporte',          src: APORTE_INICIAL,   cor: 'var(--green)', sinal: 1  },
  resgate: { label: 'Resgate',         src: RESGATE_INICIAL,  cor: 'var(--red)',   sinal: -1 },
  liquido: { label: 'Captação Líquida',src: CAPTACAO_INICIAL, cor: null,           sinal: 1  },
};

function TabelaMesMes({ visao, setVisao, ativos, meses }) {
  const ds = DS_CFG[visao];
  const totais = meses.map((_, i) =>
    ativos.reduce((s, a) => s + Math.abs(ds.src[a.cod]?.[i] || 0) * ds.sinal, 0)
  );
  const totalGeral = totais.reduce((s, v) => s + v, 0);
  const cor = v => ds.cor || (v >= 0 ? 'var(--green)' : 'var(--red)');

  return (
    <div className="table-card" style={{ marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 600, fontSize: 13, marginRight: 8 }}>Mês a Mês por Assessor</span>
        {Object.entries(DS_CFG).map(([k, d]) => (
          <button
            key={k}
            onClick={() => setVisao(k)}
            style={{
              padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
              background: visao === k ? (k === 'aporte' ? '#1D9E75' : k === 'resgate' ? '#D85A30' : '#185FA5') : 'var(--surface)',
              color: visao === k ? '#fff' : 'var(--text2)',
            }}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 2, minWidth: 220 }}>Assessor</th>
              {meses.map(m => <th key={m} style={{ textAlign: 'right', minWidth: 120 }}>{m}</th>)}
              <th style={{ textAlign: 'right', minWidth: 120 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {ativos.map(a => {
              const vals = meses.map((_, i) => Math.abs(ds.src[a.cod]?.[i] || 0) * ds.sinal);
              const total = vals.reduce((s, v) => s + v, 0);
              return (
                <tr key={a.cod}>
                  <td style={{ position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar" style={{ background: COR_CIDADE[a.cidade], width: 26, height: 26, fontSize: 9 }}>
                        {iniciais(a.nome)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{a.nome}</div>
                        <span className="cidade-pill" style={{ background: COR_BG[a.cidade], color: COR_CIDADE[a.cidade], fontSize: 10, padding: '1px 6px' }}>
                          {a.cidade}
                        </span>
                      </div>
                    </div>
                  </td>
                  {vals.map((v, i) => (
                    <td key={i} style={{ textAlign: 'right', fontSize: 12, color: cor(v), fontWeight: 500 }}>
                      {v === 0 ? <span style={{ color: 'var(--text3)' }}>—</span> : fmtM(v)}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: cor(total) }}>{fmtM(total)}</td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 1 }}>TOTAL GERAL</td>
              {totais.map((v, i) => (
                <td key={i} style={{ textAlign: 'right', fontFamily: 'Space Grotesk', color: cor(v) }}>{fmtM(v)}</td>
              ))}
              <td style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontWeight: 700, color: cor(totalGeral) }}>
                {fmtM(totalGeral)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function useChart(ref, buildConfig, deps) {
  useEffect(() => {
    if (!ref.current) return;
    const chart = new Chart(ref.current, buildConfig());
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function FluxoCaptacao() {
  const assessores = getAssessores().filter(a => a.ativo);
  const [filtro, setFiltro] = useState('');
  const [mesFiltro, setMesFiltro] = useState('');
  const [visaoMes, setVisaoMes] = useState('aporte');

  const ativos = assessores.filter(a => !filtro || a.cidade === filtro);

  // Totais mensais
  const totAporte  = MESES_DISP.map((_, i) => ativos.reduce((s, a) => s + (APORTE_INICIAL[a.cod]?.[i] || 0), 0));
  const totResgate = MESES_DISP.map((_, i) => ativos.reduce((s, a) => s + (RESGATE_INICIAL[a.cod]?.[i] || 0), 0));
  const totLiq     = MESES_DISP.map((_, i) => totAporte[i] + totResgate[i]);

  // KPIs
  const somaAporte  = totAporte.reduce((s, v) => s + v, 0);
  const somaResgate = totResgate.reduce((s, v) => s + Math.abs(v), 0);
  const somaLiq     = totLiq.reduce((s, v) => s + v, 0);
  const taxaRet     = somaAporte > 0 ? ((somaAporte - somaResgate) / somaAporte) * 100 : 0;

  // Por assessor
  const mesIdx = mesFiltro !== '' ? parseInt(mesFiltro) : null;
  const rankData = ativos.map(a => {
    const range = mesIdx !== null ? [mesIdx] : MESES_DISP.map((_, i) => i);
    const ap  = range.reduce((s, i) => s + (APORTE_INICIAL[a.cod]?.[i]  || 0), 0);
    const res = range.reduce((s, i) => s + Math.abs(RESGATE_INICIAL[a.cod]?.[i] || 0), 0);
    const liq = range.reduce((s, i) => s + (CAPTACAO_INICIAL[a.cod]?.[i] || 0), 0);
    return { ...a, ap, res, liq };
  }).sort((a, b) => b.liq - a.liq);

  const retData = [...rankData]
    .map(a => ({ ...a, taxa: a.ap > 0 ? ((a.ap - a.res) / a.ap) * 100 : 0 }))
    .sort((a, b) => b.taxa - a.taxa);

  // Charts
  const refBarMes   = useRef(null);
  const refLinha    = useRef(null);
  const refRetencao = useRef(null);

  const tickFmt = v => fmtM(v);

  // Formato abreviado para rótulos dentro dos gráficos
  const fmtShort = v => {
    const abs = Math.abs(v);
    if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toFixed(0);
  };

  useChart(refBarMes, () => ({
    type: 'bar',
    data: {
      labels: MESES_DISP,
      datasets: [
        { label: 'Aporte',  data: totAporte,               backgroundColor: 'rgba(29,158,117,0.8)', borderRadius: 4 },
        { label: 'Resgate', data: totResgate.map(Math.abs), backgroundColor: 'rgba(216,90,48,0.8)',  borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmtM(c.raw)}` } },
        datalabels: {
          color: '#fff',
          font: { size: 9, weight: '700' },
          formatter: fmtShort,
          anchor: 'center',
          align: 'center',
        },
      },
      scales: { x: { grid: { display: false } }, y: { ticks: { callback: tickFmt }, grid: { color: 'rgba(0,0,0,0.05)' } } },
    },
  }), [filtro]);

  useChart(refLinha, () => ({
    type: 'line',
    data: {
      labels: MESES_DISP,
      datasets: [{
        label: 'Captação Líquida',
        data: totLiq,
        borderColor: '#185FA5',
        pointBackgroundColor: totLiq.map(v => v >= 0 ? '#1D9E75' : '#D85A30'),
        pointRadius: 5,
        tension: 0.35,
        fill: false,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `Líq.: ${fmtM(c.raw)}` } },
        datalabels: {
          color: ctx => ctx.raw >= 0 ? '#1D9E75' : '#D85A30',
          font: { size: 9, weight: '700' },
          formatter: fmtShort,
          anchor: 'end',
          align: ctx => ctx.raw >= 0 ? 'top' : 'bottom',
          offset: 4,
        },
      },
      scales: { x: { grid: { display: false } }, y: { ticks: { callback: tickFmt }, grid: { color: 'rgba(0,0,0,0.05)' } } },
    },
  }), [filtro]);

  useChart(refRetencao, () => ({
    type: 'bar',
    data: {
      labels: retData.map(a => a.nome.split(' ')[0]),
      datasets: [{
        label: 'Taxa de Retenção (%)',
        data: retData.map(a => a.taxa),
        backgroundColor: retData.map(a => a.taxa >= 0 ? 'rgba(24,95,165,0.75)' : 'rgba(216,90,48,0.75)'),
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => `Retenção: ${c.raw.toFixed(1)}%` } },
        datalabels: {
          color: '#fff',
          font: { size: 10, weight: '700' },
          formatter: v => `${v.toFixed(1)}%`,
          anchor: 'center',
          align: 'center',
        },
      },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { ticks: { callback: v => `${v.toFixed(0)}%` }, grid: { color: 'rgba(0,0,0,0.05)' } } },
    },
  }), [filtro, mesFiltro]);

  const periodoLabel = mesFiltro !== '' ? `— ${MESES_DISP[parseInt(mesFiltro)]}` : '(Jan–Jul acumulado)';

  return (
    <>
      {/* Filtros */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <select value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todas as cidades</option>
          {Object.entries(CIDADES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
        <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} style={{ marginLeft: 8 }}>
          <option value="">Jan–Jul (acumulado)</option>
          {MESES_DISP.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Aporte (Jan–Jul)',  val: fmtM(somaAporte),   color: '#1D9E75' },
          { label: 'Total Resgate (Jan–Jul)', val: fmtM(-somaResgate), color: '#D85A30' },
          { label: 'Captação Líquida',        val: fmtM(somaLiq),      color: somaLiq >= 0 ? '#185FA5' : '#D85A30' },
          { label: 'Taxa de Retenção',        val: `${taxaRet.toFixed(1)}%`, color: taxaRet >= 0 ? '#7F77DD' : '#D85A30' },
        ].map(k => (
          <div key={k.label} className="table-card" style={{ padding: '14px 18px', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'Space Grotesk' }}>{k.val}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Gráficos linha 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="table-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Aporte vs Resgate por Mês</div>
          <div style={{ height: 240 }}><canvas ref={refBarMes} /></div>
        </div>
        <div className="table-card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Captação Líquida Mensal</div>
          <div style={{ height: 240 }}><canvas ref={refLinha} /></div>
        </div>
      </div>

      {/* Tabela mês a mês por assessor */}
      <TabelaMesMes
        visao={visaoMes}
        setVisao={setVisaoMes}
        ativos={ativos}
        meses={MESES_DISP}
      />

      {/* Taxa de retenção */}
      <div className="table-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>
          Taxa de Retenção por Assessor {periodoLabel}
        </div>
        <div style={{ height: 230 }}><canvas ref={refRetencao} /></div>
      </div>

      {/* Tabela detalhada */}
      <div className="table-card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--border)' }}>
          Detalhamento por Assessor {periodoLabel}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Assessor</th>
                <th style={{ textAlign: 'right' }}>Aporte</th>
                <th style={{ textAlign: 'right' }}>Resgate</th>
                <th style={{ textAlign: 'right' }}>Captação Líq.</th>
                <th style={{ textAlign: 'right' }}>Retenção</th>
              </tr>
            </thead>
            <tbody>
              {rankData.map(a => {
                const taxa = a.ap > 0 ? ((a.ap - a.res) / a.ap) * 100 : 0;
                return (
                  <tr key={a.cod}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ background: COR_CIDADE[a.cidade], width: 28, height: 28, fontSize: 10 }}>
                          {iniciais(a.nome)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 12 }}>{a.nome}</div>
                          <span className="cidade-pill" style={{ background: COR_BG[a.cidade], color: COR_CIDADE[a.cidade], fontSize: 10, padding: '1px 6px' }}>
                            {a.cidade}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 500 }}>{fmtM(a.ap)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--red)',   fontWeight: 500 }}>{fmtM(-a.res)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: a.liq >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtM(a.liq)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ color: taxa >= 0 ? '#7F77DD' : '#D85A30', fontWeight: 600 }}>{taxa.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
