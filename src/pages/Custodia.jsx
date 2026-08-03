import { useState } from 'react';
import * as XLSX from 'xlsx';
import { MESES, CIDADES, COR_CIDADE, COR_BG } from '../data/dados';
import { getAssessores, getCustodia, saveCustodia } from '../data/store';
import { fmtMCustodia, iniciais } from '../utils/fmt';

export default function Custodia() {
  const [assessores]  = useState(getAssessores);
  const [dados, setDados] = useState(getCustodia);
  const [filtro, setFiltro] = useState('');
  const [saved, setSaved] = useState(false);

  const ativos = assessores.filter(a => a.ativo && (!filtro || a.cidade === filtro));

  function handleChange(cod, mes, val) {
    const num = parseFloat(val) || 0;
    setDados(d => ({ ...d, [cod]: d[cod]?.map((v, i) => i === mes ? num : v) || Array(12).fill(0).map((v, i) => i === mes ? num : v) }));
  }

  function handleSave() {
    saveCustodia(dados);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function exportar() {
    const rows = ativos.map(a => ({
      Código: a.cod, Assessor: a.nome, Cidade: CIDADES[a.cidade],
      ...Object.fromEntries(MESES.map((m, i) => [m, dados[a.cod]?.[i] || 0]))
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Custódia');
    XLSX.writeFile(wb, 'custodia.xlsx');
  }

  const totaisMes = MESES.map((_, i) =>
    ativos.reduce((s, a) => s + (dados[a.cod]?.[i] || 0), 0)
  );

  const totaisCidade = Object.fromEntries(
    Object.keys(CIDADES).map(c => [c,
      MESES.map((_, i) =>
        assessores.filter(a => a.ativo && a.cidade === c).reduce((s, a) => s + (dados[a.cod]?.[i] || 0), 0)
      )
    ])
  );

  return (
    <>
      <div className="filters-bar">
        <select value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todas as cidades</option>
          {Object.entries(CIDADES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={exportar}><i className="ti ti-file-spreadsheet" /> Exportar Excel</button>
          <button className="btn btn-success" onClick={handleSave}>
            <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} /> {saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="table-card editable-table">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 2, minWidth: 220 }}>Assessor</th>
                {MESES.map(m => <th key={m} style={{ textAlign: 'right', minWidth: 155 }}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {ativos.map(a => (
                <tr key={a.cod}>
                  <td style={{ position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>
                    <div className="assessor-cell">
                      <div className="avatar" style={{ background: COR_CIDADE[a.cidade] }}>{iniciais(a.nome)}</div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{a.nome}</div>
                        <span className="cidade-pill" style={{ background: COR_BG[a.cidade], color: COR_CIDADE[a.cidade], fontSize: 10, padding: '1px 6px' }}>
                          {a.cidade}
                        </span>
                      </div>
                    </div>
                  </td>
                  {MESES.map((_, i) => (
                    <td key={i} style={{ textAlign: 'right', padding: '6px 8px' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={dados[a.cod]?.[i] || 0}
                        onChange={e => handleChange(a.cod, i, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              {!filtro && Object.entries(CIDADES).map(([c, nome]) => (
                <tr key={c} style={{ borderTop: '2px solid var(--border)' }}>
                  <td style={{ position: 'sticky', left: 0, background: COR_BG[c], zIndex: 1, fontWeight: 700 }}>
                    <span style={{ color: COR_CIDADE[c] }}>{nome}</span>
                  </td>
                  {totaisCidade[c].map((v, i) => (
                    <td key={i} style={{ textAlign: 'right', fontWeight: 600, background: COR_BG[c], color: COR_CIDADE[c], fontSize: 12 }}>
                      {fmtMCustodia(v)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="total-row">
                <td style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 1 }}>TOTAL GERAL</td>
                {totaisMes.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right', fontFamily: 'Space Grotesk' }}>
                    {fmtMCustodia(v)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
