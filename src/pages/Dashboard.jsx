import { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { getAssessores, getCustodia } from '../data/store.js';
import { MESES, COR_CIDADE, CIDADES } from '../data/dados.js';
import { fmtBRL, fmtPct, initials } from '../utils/fmt.js';

export default function Dashboard() {
  const [mes, setMes] = useState(7); // Ago (0-indexed)
  const lineRef = useRef(null);
  const barRef = useRef(null);
  const lineChart = useRef(null);
  const barChart = useRef(null);

  const assessores = getAssessores();
  const custodia = getCustodia();

  const ativos = assessores.filter(a => a.ativo);

  // Total custódia no mês
  const totalMes = ativos.reduce((s, a) => s + (custodia[a.cod]?.[mes] || 0), 0);

  // Por cidade no mês
  const porCidade = Object.keys(CIDADES).map(c => ({
    cidade: c,
    label: CIDADES[c],
    total: ativos.filter(a=>a.cidade===c).reduce((s,a)=>s+(custodia[a.cod]?.[mes]||0),0),
  }));

  // Evolução mensal por cidade
  const evolucao = Object.keys(CIDADES).map(c => ({
    cidade: c,
    data: MESES.map((_,i) => ativos.filter(a=>a.cidade===c).reduce((s,a)=>s+(custodia[a.cod]?.[i]||0),0)),
  }));

  // Top 5
  const top5 = [...ativos]
    .map(a => ({ ...a, val: custodia[a.cod]?.[mes] || 0 }))
    .filter(a => a.val > 0)
    .sort((a,b) => b.val - a.val)
    .slice(0, 5);

  useEffect(() => {
    if (lineChart.current) lineChart.current.destroy();
    if (!lineRef.current) return;
    lineChart.current = new Chart(lineRef.current, {
      type: 'line',
      data: {
        labels: MESES,
        datasets: evolucao.map(e => ({
          label: CIDADES[e.cidade],
          data: e.data,
          borderColor: COR_CIDADE[e.cidade],
          backgroundColor: COR_CIDADE[e.cidade] + '22',
          tension: 0.3,
          fill: false,
          pointRadius: 3,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: { ticks: { callback: v => fmtBRL(v, true) } },
        },
      },
    });
  }, [mes]);

  useEffect(() => {
    if (barChart.current) barChart.current.destroy();
    if (!barRef.current) return;
    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: porCidade.map(c => c.label),
        datasets: [{
          data: porCidade.map(c => c.total),
          backgroundColor: Object.keys(CIDADES).map(c => COR_CIDADE[c]),
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: v => fmtBRL(v, true) } },
        },
      },
    });
  }, [mes]);

  return (
    <div className="dashboard">
      <div className="section-header">
        <span className="section-label">Visão Geral — Custódia</span>
        <select className="select-sm" value={mes} onChange={e=>setMes(+e.target.value)}>
          {MESES.map((m,i)=><option key={i} value={i}>{m} 2026</option>)}
        </select>
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Custódia Total</div>
          <div className="kpi-value">{fmtBRL(totalMes, true)}</div>
          <div className="kpi-sub">{MESES[mes]} 2026</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Assessores Ativos</div>
          <div className="kpi-value">{ativos.length}</div>
          <div className="kpi-sub">de {assessores.length} total</div>
        </div>
        {porCidade.map(c=>(
          <div key={c.cidade} className="kpi-card" style={{borderTop:`3px solid ${COR_CIDADE[c.cidade]}`}}>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{fmtBRL(c.total, true)}</div>
            <div className="kpi-sub">{fmtPct(totalMes ? c.total/totalMes*100 : 0)} do total</div>
          </div>
        ))}
      </div>

      <div className="charts-row">
        <div className="chart-card" style={{flex:2}}>
          <div className="chart-title">Evolução Custódia por Cidade (2026)</div>
          <div style={{height:280}}><canvas ref={lineRef}/></div>
        </div>
        <div className="chart-card" style={{flex:1}}>
          <div className="chart-title">Custódia por Cidade — {MESES[mes]}</div>
          <div style={{height:280}}><canvas ref={barRef}/></div>
        </div>
      </div>

      <div className="table-card">
        <div className="chart-title">Top 5 Assessores — {MESES[mes]} 2026</div>
        <table className="data-table">
          <thead><tr><th>#</th><th>Assessor</th><th>Cidade</th><th>Custódia</th><th>Tendência</th></tr></thead>
          <tbody>
            {top5.map((a, i) => {
              const hist = (custodia[a.cod] || []).slice(0, mes+1).filter(v=>v>0);
              return (
                <tr key={a.cod}>
                  <td><span className="rank-badge">{i+1}</span></td>
                  <td>
                    <div className="assessor-cell">
                      <span className="avatar" style={{background: COR_CIDADE[a.cidade]+'33', color: COR_CIDADE[a.cidade]}}>{initials(a.nome)}</span>
                      <div>
                        <div className="assessor-nome">{a.nome}</div>
                        <div className="assessor-cod">{a.cod}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="city-pill" style={{background:COR_CIDADE[a.cidade]+'22',color:COR_CIDADE[a.cidade]}}>{a.cidade}</span></td>
                  <td className="num">{fmtBRL(a.val)}</td>
                  <td>
                    <svg width="80" height="30" viewBox="0 0 80 30">
                      {hist.length > 1 && hist.map((v,j)=>{
                        if(j===0) return null;
                        const minV=Math.min(...hist), maxV=Math.max(...hist), range=maxV-minV||1;
                        const x1=(j-1)/(hist.length-1)*78+1, y1=28-(hist[j-1]-minV)/range*26;
                        const x2=j/(hist.length-1)*78+1, y2=28-(v-minV)/range*26;
                        return <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#185FA5" strokeWidth="2"/>;
                      })}
                    </svg>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
