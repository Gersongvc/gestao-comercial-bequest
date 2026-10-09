import { useState } from 'react';
import * as XLSX from 'xlsx';
import { MESES, CIDADES, COR_CIDADE, COR_BG } from '../data/dados';
import { CAPTACAO_INICIAL } from '../data/dados';
import { getAssessores, getCaptacao, saveCaptacao } from '../data/store';
import { fmtM, iniciais } from '../utils/fmt';

function ValCell({ v }) {
  if (!v) return <span className="val-zero">—</span>;
  return <span className={v > 0 ? 'val-pos' : 'val-neg'}>{fmtM(v)}</span>;
}

export default function Captacao() {
  const [assessores]  = useState(getAssessores);
  const [dados, setDados] = useState(getCaptacao);
  const [filtro, setFiltro] = useState('');
  const [saved,     setSaved]     = useState(false);
  const [imported,  setImported]  = useState(false);

  const ativos = assessores.filter(a => a.ativo && (!filtro || a.cidade === filtro));

  function handleChange(cod, mes, val) {
    const num = val === '' || val === '-' ? 0 : parseFloat(val) || 0;
    setDados(d => {
      const arr = d[cod] ? [...d[cod]] : Array(12).fill(0);
      arr[mes] = num;
      return { ...d, [cod]: arr };
    });
  }

  function handleSave() {
    saveCaptacao(dados);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleImportarBase() {
    setDados(CAPTACAO_INICIAL);
    saveCaptacao(CAPTACAO_INICIAL);
    setImported(true);
    setTimeout(() => setImported(false), 2500);
  }

  function exportar() {
    const rows = ativos.map(a => ({
      Código: a.cod, Assessor: a.nome, Cidade: CIDADES[a.cidade],
      ...Object.fromEntries(MESES.map((m, i) => [m, dados[a.cod]?.[i] || 0]))
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Captação');
    XLSX.writeFile(wb, 'captacao.xlsx');
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
      <div style={{ background: '#FEF5E5', border: '1px solid #F0D18C', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#8A5C00' }}>
        <i className="ti ti-alert-triangle" style={{ marginRight: 6 }} />
        Atenção: Vitor Palazzo (A69580) apresenta captação de −R$ 106,2M em Março — valor possivelmente incorreto na fonte original.
      </div>

      <div className="filters-bar">
        <select value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todas as cidades</option>
          {Object.entries(CIDADES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={handleImportarBase} title="Carrega os dados da planilha Consolidação.xlsx (Jan–Jul/2026)">
            <i className={`ti ${imported ? 'ti-check' : 'ti-table-import'}`} /> {imported ? 'Importado!' : 'Importar base'}
          </button>
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
                  {MESES.map((_, i) => {
                    const v = dados[a.cod]?.[i] || 0;
                    return (
                      <td key={i} style={{ textAlign: 'right', padding: '6px 8px' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={v}
                          onChange={e => handleChange(a.cod, i, e.target.value)}
                          style={{ color: v < 0 ? 'var(--red)' : v > 0 ? 'var(--green)' : 'var(--text3)' }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!filtro && Object.entries(CIDADES).map(([c, nome]) => (
                <tr key={c} style={{ borderTop: '2px solid var(--border)' }}>
                  <td style={{ position: 'sticky', left: 0, background: COR_BG[c], zIndex: 1, fontWeight: 700 }}>
                    <span style={{ color: COR_CIDADE[c] }}>{nome}</span>
                  </td>
                  {totaisCidade[c].map((v, i) => (
                    <td key={i} style={{ textAlign: 'right', fontWeight: 600, background: COR_BG[c], fontSize: 12 }}>
                      <ValCell v={v} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="total-row">
                <td style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 1 }}>TOTAL GERAL</td>
                {totaisMes.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right', fontFamily: 'Space Grotesk' }}>
                    <ValCell v={v} />
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
