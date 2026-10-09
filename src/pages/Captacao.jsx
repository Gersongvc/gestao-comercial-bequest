import { useState } from 'react';
import { getAssessores, getCaptacao, setCaptacao } from '../data/store.js';
import { MESES, COR_CIDADE, CIDADES } from '../data/dados.js';
import { fmtBRL } from '../utils/fmt.js';

export default function Captacao() {
  const [cidFiltro, setCidFiltro] = useState('');
  const assessores = getAssessores().filter(a => a.ativo);
  const [dados, setDados] = useState(getCaptacao());
  const [saved, setSaved] = useState(false);

  const filtrado = assessores.filter(a => !cidFiltro || a.cidade === cidFiltro);

  const update = (cod, i, val) => {
    const raw = val.replace(/\s/g,'').replace('R$','').replace(/\./g,'').replace(',','.');
    const num = parseFloat(raw) || 0;
    setDados(d => ({ ...d, [cod]: (d[cod]||Array(12).fill(0)).map((v,j)=>j===i?num:v) }));
  };

  const save = () => { setCaptacao(dados); setSaved(true); setTimeout(()=>setSaved(false),2000); };

  const exportXlsx = async () => {
    const { utils, writeFile } = await import('xlsx');
    const rows = [['Assessor','Código','Cidade',...MESES,'Total']];
    filtrado.forEach(a => {
      const vals = dados[a.cod] || Array(12).fill(0);
      rows.push([a.nome, a.cod, CIDADES[a.cidade], ...vals, vals.reduce((s,v)=>s+v,0)]);
    });
    const ws = utils.aoa_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Captação 2026');
    writeFile(wb, 'captacao_2026.xlsx');
  };

  const totais = MESES.map((_,i) => filtrado.reduce((s,a)=>s+(dados[a.cod]?.[i]||0),0));

  const formatVal = (v) => {
    if (!v) return '0';
    return v.toLocaleString('pt-BR', {minimumFractionDigits:2});
  };

  return (
    <div>
      <div className="toolbar">
        <select className="select-sm" value={cidFiltro} onChange={e=>setCidFiltro(e.target.value)}>
          <option value="">Todas as cidades</option>
          {Object.entries(CIDADES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-primary" onClick={save}><i className="ti ti-device-floppy"></i> {saved?'Salvo!':'Salvar'}</button>
        <button className="btn-ghost" onClick={exportXlsx}><i className="ti ti-file-spreadsheet"></i> Exportar Excel</button>
      </div>

      <div className="info-banner">
        <i className="ti ti-info-circle"></i> Dados de Captação Líquida Jan–Ago 2026. Valores negativos (em vermelho) indicam resgates superiores a aportes.
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
                {MESES.map((_,i)=>{
                  const v = dados[a.cod]?.[i] || 0;
                  return (
                    <td key={i}>
                      <input
                        className={`cell-input ${v < 0 ? 'negative' : ''}`}
                        type="text"
                        value={formatVal(v)}
                        onChange={e=>update(a.cod,i,e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="totals-row">
              <td colSpan={2}><strong>Total</strong></td>
              {totais.map((t,i)=>(
                <td key={i} className={`num ${t<0?'neg':t>0?'pos':''}`}>
                  <strong>{fmtBRL(t,true)}</strong>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
