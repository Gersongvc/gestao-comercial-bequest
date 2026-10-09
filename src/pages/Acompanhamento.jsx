import { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { getAssessores, getCustodia, getCaptacao } from '../data/store.js';
import { MESES, COR_CIDADE, CIDADES } from '../data/dados.js';
import { fmtBRL, fmtPct, initials } from '../utils/fmt.js';

const TABS = ['Ranking','Mês a mês','Por cidade','Captação'];

export default function Acompanhamento() {
  const [tab, setTab] = useState(0);
  const [mes, setMes] = useState(7);

  const assessores = getAssessores().filter(a => a.ativo);
  const custodia = getCustodia();
  const captacao = getCaptacao();

  return (
    <div>
      <div className="tabs-row">
        {TABS.map((t,i)=>(
          <button key={i} className={`tab-btn ${tab===i?'active':''}`} onClick={()=>setTab(i)}>{t}</button>
        ))}
        <div style={{flex:1}}/>
        <select className="select-sm" value={mes} onChange={e=>setMes(+e.target.value)}>
          {MESES.map((m,i)=><option key={i} value={i}>{m} 2026</option>)}
        </select>
      </div>

      {tab===0 && <Ranking assessores={assessores} custodia={custodia} mes={mes}/>}
      {tab===1 && <MesAMes assessores={assessores} custodia={custodia} mes={mes}/>}
      {tab===2 && <PorCidade assessores={assessores} custodia={custodia} mes={mes}/>}
      {tab===3 && <TabCaptacao assessores={assessores} captacao={captacao} mes={mes}/>}
    </div>
  );
}

function Ranking({ assessores, custodia, mes }) {
  const [cidFiltro, setCidFiltro] = useState('');
  const metasXP = JSON.parse(localStorage.getItem('bc_meta_xp_assessor') || '{}');
  const metasPes = JSON.parse(localStorage.getItem('bc_meta_pes_assessor') || '{}');

  const lista = assessores
    .filter(a => !cidFiltro || a.cidade === cidFiltro)
    .map(a => ({
      ...a,
      cust: custodia[a.cod]?.[mes] || 0,
      metaXP: metasXP[a.cod]?.[mes] || 0,
      metaPes: metasPes[a.cod]?.[mes] || 0,
    }))
    .sort((a,b) => b.cust - a.cust);

  return (
    <div>
      <div className="toolbar">
        <select className="select-sm" value={cidFiltro} onChange={e=>setCidFiltro(e.target.value)}>
          <option value="">Todas as cidades</option>
          {Object.entries(CIDADES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="table-card">
        <table className="data-table">
          <thead><tr><th>#</th><th>Assessor</th><th>Cidade</th><th>Custódia</th><th>% Meta XP</th><th>% Meta Pessoal</th><th>Status</th></tr></thead>
          <tbody>
            {lista.map((a,i) => {
              const pctXP  = a.metaXP  ? a.cust/a.metaXP*100  : null;
              const pctPes = a.metaPes ? a.cust/a.metaPes*100 : null;
              const status = pctXP === null ? 'gray' : pctXP >= 100 ? 'green' : pctXP >= 80 ? 'amber' : 'red';
              return (
                <tr key={a.cod}>
                  <td><span className="rank-badge">{i+1}</span></td>
                  <td>
                    <div className="assessor-cell">
                      <span className="avatar" style={{background:COR_CIDADE[a.cidade]+'33',color:COR_CIDADE[a.cidade]}}>{initials(a.nome)}</span>
                      <div><div className="assessor-nome">{a.nome}</div><div className="assessor-cod">{a.cod}</div></div>
                    </div>
                  </td>
                  <td><span className="city-pill" style={{background:COR_CIDADE[a.cidade]+'22',color:COR_CIDADE[a.cidade]}}>{a.cidade}</span></td>
                  <td className="num">{fmtBRL(a.cust)}</td>
                  <td>
                    {pctXP !== null ? (
                      <div className="progress-wrap">
                        <div className="progress-bar"><div className="progress-fill blue" style={{width:Math.min(pctXP,100)+'%'}}/></div>
                        <span>{fmtPct(pctXP)}</span>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    {pctPes !== null ? (
                      <div className="progress-wrap">
                        <div className="progress-bar"><div className="progress-fill purple" style={{width:Math.min(pctPes,100)+'%'}}/></div>
                        <span>{fmtPct(pctPes)}</span>
                      </div>
                    ) : <span className="text-muted">—</span>}
                  </td>
                  <td><span className={`status-pill ${status}`}>{status==='green'?'✓ Meta':status==='amber'?'⚠ Próximo':'✗ Abaixo'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MesAMes({ assessores, custodia, mes }) {
  return (
    <div className="table-card" style={{overflowX:'auto'}}>
      <table className="data-table fixed-table">
        <thead>
          <tr>
            <th className="col-nome">Assessor</th>
            <th>Cidade</th>
            {MESES.map((m,i)=><th key={i} className={`col-mes ${i===mes?'col-atual':''}`}>{m}</th>)}
          </tr>
        </thead>
        <tbody>
          {assessores.map(a => (
            <tr key={a.cod}>
              <td><div className="assessor-nome">{a.nome}</div><div className="assessor-cod">{a.cod}</div></td>
              <td><span className="city-pill" style={{background:COR_CIDADE[a.cidade]+'22',color:COR_CIDADE[a.cidade]}}>{a.cidade}</span></td>
              {MESES.map((_,i)=>(
                <td key={i} className={`num ${i===mes?'col-atual':''}`}>
                  {custodia[a.cod]?.[i] ? fmtBRL(custodia[a.cod][i],true) : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PorCidade({ assessores, custodia, mes }) {
  const canvasRef = useRef(null);
  const chart = useRef(null);

  const porCidade = Object.keys(CIDADES).map(c => ({
    c, label: CIDADES[c],
    meses: MESES.map((_,i) => assessores.filter(a=>a.cidade===c).reduce((s,a)=>s+(custodia[a.cod]?.[i]||0),0)),
    total: assessores.filter(a=>a.cidade===c).reduce((s,a)=>s+(custodia[a.cod]?.[mes]||0),0),
  }));

  const totalGeral = porCidade.reduce((s,c)=>s+c.total,0);

  useEffect(()=>{
    if (chart.current) chart.current.destroy();
    if (!canvasRef.current) return;
    chart.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: MESES,
        datasets: porCidade.map(c=>({
          label: c.label,
          data: c.meses,
          backgroundColor: COR_CIDADE[c.c]+'CC',
          borderRadius: 4,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position:'bottom' } },
        scales: {
          x: { stacked: true },
          y: { stacked: true, ticks: { callback: v => fmtBRL(v,true) } },
        },
      },
    });
  },[mes]);

  return (
    <div>
      <div className="kpi-row" style={{marginBottom:16}}>
        <div className="kpi-card">
          <div className="kpi-label">Total Geral — {MESES[mes]}</div>
          <div className="kpi-value">{fmtBRL(totalGeral,true)}</div>
        </div>
        {porCidade.map(c=>(
          <div key={c.c} className="kpi-card" style={{borderTop:`3px solid ${COR_CIDADE[c.c]}`}}>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{fmtBRL(c.total,true)}</div>
            <div className="kpi-sub">{fmtPct(totalGeral?c.total/totalGeral*100:0)}</div>
          </div>
        ))}
      </div>
      <div className="chart-card">
        <div className="chart-title">Custódia Acumulada por Cidade (2026)</div>
        <div style={{height:320}}><canvas ref={canvasRef}/></div>
      </div>
    </div>
  );
}

function TabCaptacao({ assessores, captacao, mes }) {
  const canvasRef = useRef(null);
  const chart = useRef(null);

  const porCidade = Object.keys(CIDADES).map(c => ({
    c, label: CIDADES[c],
    meses: MESES.map((_,i) => assessores.filter(a=>a.cidade===c).reduce((s,a)=>s+(captacao[a.cod]?.[i]||0),0)),
    total: assessores.filter(a=>a.cidade===c).reduce((s,a)=>s+(captacao[a.cod]?.[mes]||0),0),
  }));

  const totalGeral = porCidade.reduce((s,c)=>s+c.total,0);

  useEffect(()=>{
    if (chart.current) chart.current.destroy();
    if (!canvasRef.current) return;
    chart.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: MESES,
        datasets: porCidade.map(c=>({
          label: c.label,
          data: c.meses,
          backgroundColor: COR_CIDADE[c.c]+'BB',
          borderRadius: 4,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position:'bottom' } },
        scales: {
          x: { stacked: true },
          y: { stacked: true, ticks: { callback: v => fmtBRL(v,true) } },
        },
      },
    });
  },[mes]);

  return (
    <div>
      <div className="kpi-row" style={{marginBottom:16}}>
        <div className={`kpi-card ${totalGeral<0?'kpi-neg':''}`}>
          <div className="kpi-label">Captação Total — {MESES[mes]}</div>
          <div className={`kpi-value ${totalGeral<0?'neg':'pos'}`}>{fmtBRL(totalGeral,true)}</div>
        </div>
        {porCidade.map(c=>(
          <div key={c.c} className="kpi-card" style={{borderTop:`3px solid ${COR_CIDADE[c.c]}`}}>
            <div className="kpi-label">{c.label}</div>
            <div className={`kpi-value ${c.total<0?'neg':'pos'}`}>{fmtBRL(c.total,true)}</div>
          </div>
        ))}
      </div>
      <div className="chart-card">
        <div className="chart-title">Captação Líquida por Cidade (2026)</div>
        <div style={{height:320}}><canvas ref={canvasRef}/></div>
      </div>
    </div>
  );
}
