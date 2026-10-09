import { useState } from 'react';
import { getAssessores, getMetaXP, setMetaXP, getMetaPessoal, setMetaPessoal } from '../data/store.js';
import { MESES, COR_CIDADE, CIDADES } from '../data/dados.js';
import { fmtBRL } from '../utils/fmt.js';

export default function Metas() {
  const [tipo, setTipo] = useState('xp');
  const [cidFiltro, setCidFiltro] = useState('');
  const assessores = getAssessores().filter(a => a.ativo);
  const [metaXP, setMX] = useState(getMetaXP());
  const [metaP, setMP] = useState(getMetaPessoal());
  const [saved, setSaved] = useState(false);

  // Para metas por assessor (armazenadas como objetos cod→[12])
  const [xpAssessor, setXPA] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bc_meta_xp_assessor')) || {}; } catch { return {}; }
  });
  const [pesAssessor, setPesA] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bc_meta_pes_assessor')) || {}; } catch { return {}; }
  });

  const dados = tipo === 'xp' ? xpAssessor : pesAssessor;
  const setDados = tipo === 'xp' ? setXPA : setPesA;
  const storageKey = tipo === 'xp' ? 'bc_meta_xp_assessor' : 'bc_meta_pes_assessor';

  const filtrado = assessores.filter(a => !cidFiltro || a.cidade === cidFiltro);

  const update = (cod, i, val) => {
    const raw = val.replace(/\s/g,'').replace('R$','').replace(/\./g,'').replace(',','.');
    const num = parseFloat(raw) || 0;
    setDados(d => ({ ...d, [cod]: (d[cod]||Array(12).fill(0)).map((v,j)=>j===i?num:v) }));
  };

  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify(dados));
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const totais = MESES.map((_,i) => filtrado.reduce((s,a)=>s+(dados[a.cod]?.[i]||0),0));

  return (
    <div>
      <div className="toolbar">
        <div className="toggle-group">
          <button className={`toggle-btn ${tipo==='xp'?'active':''}`} onClick={()=>setTipo('xp')}>Meta XP</button>
          <button className={`toggle-btn ${tipo==='pessoal'?'active':''}`} onClick={()=>setTipo('pessoal')}>Meta Pessoal</button>
        </div>
        <select className="select-sm" value={cidFiltro} onChange={e=>setCidFiltro(e.target.value)}>
          <option value="">Todas as cidades</option>
          {Object.entries(CIDADES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-primary" onClick={save}><i className="ti ti-device-floppy"></i> {saved?'Salvo!':'Salvar'}</button>
      </div>

      <div className="info-banner">
        <i className="ti ti-target"></i> {tipo==='xp'
          ? 'Metas XP: objetivos de custódia definidos pela XP Investimentos para cada assessor (2026).'
          : 'Metas Pessoais: objetivos individuais definidos pela gestão da Bequest Capital (2026).'}
      </div>

      <div className="table-card" style={{overflowX:'auto'}}>
        <table className="data-table fixed-table">
          <thead>
            <tr>
              <th className="col-nome">Assessor</th>
              <th>Cidade</th>
              {MESES.map(m=><th key={m} className="col-mes">{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtrado.map(a => (
              <tr key={a.cod}>
                <td>
                  <div className="assessor-nome">{a.nome}</div>
                  <div className="assessor-cod">{a.cod}</div>
                </td>
                <td><span className="city-pill" style={{background:COR_CIDADE[a.cidade]+'22',color:COR_CIDADE[a.cidade]}}>{a.cidade}</span></td>
                {MESES.map((_,i)=>(
                  <td key={i}>
                    <input
                      className="cell-input"
                      type="text"
                      value={((dados[a.cod]?.[i])||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                      onChange={e=>update(a.cod,i,e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="totals-row">
              <td colSpan={2}><strong>Total</strong></td>
              {totais.map((t,i)=><td key={i} className="num"><strong>{fmtBRL(t,true)}</strong></td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
