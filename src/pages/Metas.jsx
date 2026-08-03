import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  MESES, CIDADES, COR_CIDADE, COR_BG,
  CUSTODIA_FINAL_2025, CAPTACAO_TOTAL_2025,
  CRESCIMENTO_CUSTODIA_2026, CRESCIMENTO_CAPTACAO_2026,
} from '../data/dados';
import {
  getAssessores,
  getMetasCustodia, saveMetasCustodia, gerarMetasCustodia2026,
  getMetasCaptacao, saveMetasCaptacao, gerarMetasCaptacao2026,
} from '../data/store';
import { fmtMCustodia, fmtM, fmtPct, iniciais } from '../utils/fmt';

/* ─────────────────────────────────────────────────────────
   Máscara de moeda BRL
   • Em foco   → mostra o número puro para edição livre
   • Em blur   → formata como R$ 1.234.567,89
   • Aceita negativos (para captação)
───────────────────────────────────────────────────────────── */
function CurrencyInput({ value, onChange, allowNegative = false }) {
  const [focused,  setFocused]  = useState(false);
  const [rawText,  setRawText]  = useState('');
  const inputRef = useRef(null);

  function format(v) {
    if (!v && v !== 0) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: 'BRL',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(v);
  }

  function parse(str) {
    if (!str || str === '' || str === '-') return 0;
    const cleaned = str.replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.').trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  const displayValue = focused ? rawText : format(value);

  function handleFocus() {
    setFocused(true);
    setRawText(value === 0 ? '' : String(value).replace('.', ','));
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function handleBlur() {
    setFocused(false);
    onChange(parse(rawText));
  }

  function handleChange(e) {
    setRawText(e.target.value);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.target.blur(); }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        width: 148,
        padding: '4px 8px',
        border: '1px solid transparent',
        borderRadius: 6,
        fontSize: focused ? 13 : 12,
        textAlign: 'right',
        fontFamily: focused ? 'inherit' : "'Space Grotesk', sans-serif",
        background: focused ? '#fff' : 'transparent',
        color: value < 0 ? 'var(--red)' : value > 0 ? 'var(--text)' : 'var(--text3)',
        outline: 'none',
        cursor: 'text',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { if (!focused) e.target.style.borderColor = 'var(--border)'; }}
      onMouseLeave={e => { if (!focused) e.target.style.borderColor = 'transparent'; }}
    />
  );
}

/* ─────────────────────────────────────────────────────────
   Painel de validação: confirma que soma(metas_ind) = meta_time
───────────────────────────────────────────────────────────── */
function PainelValidacao({ assessores, dadosCust, dadosCap }) {
  const ativos = assessores.filter(a => a.ativo);

  const baseCustTotal = ativos.reduce((s, a) => s + (CUSTODIA_FINAL_2025[a.cod] || 0), 0);
  const baseCapTotal  = ativos.reduce((s, a) => s + (CAPTACAO_TOTAL_2025[a.cod]  || 0), 0);
  const alvoCust      = baseCustTotal * (1 + CRESCIMENTO_CUSTODIA_2026);
  const alvoCap       = baseCapTotal  * (1 + CRESCIMENTO_CAPTACAO_2026);

  // Soma das metas individuais em Dez (mês 11) para custódia
  const somaCustDez  = ativos.reduce((s, a) => s + (dadosCust[a.cod]?.[11] || 0), 0);
  // Soma das metas anuais (12×mensal) para captação
  const somaCapAnual = ativos.reduce((s, a) => {
    const mensal = dadosCap[a.cod]?.[0] || 0; // todos os meses são iguais
    return s + mensal * 12;
  }, 0);

  const diffCust = somaCustDez - alvoCust;
  const diffCap  = somaCapAnual - alvoCap;
  const ok = (v) => Math.abs(v) < 1000; // tolerância de R$ 1k por arredondamento

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
      background: 'var(--surface2)', borderRadius: 12, padding: 16,
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text3)', gridColumn: '1/-1', fontWeight: 600, marginBottom: 4 }}>
        ✅ Validação: soma das metas individuais = meta consolidada do time?
      </div>

      {/* Custódia */}
      <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 14px', border: `1px solid ${ok(diffCust) ? '#A8DFC8' : '#F0C4B4'}` }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 6 }}>CUSTÓDIA — Dez/2026</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
          <span style={{ color: 'var(--text3)' }}>Meta time:</span>
          <span style={{ fontWeight: 600 }}>{fmtMCustodia(alvoCust)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
          <span style={{ color: 'var(--text3)' }}>Soma indiv.:</span>
          <span style={{ fontWeight: 600 }}>{fmtMCustodia(somaCustDez)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
          <span style={{ fontWeight: 700 }}>Diferença:</span>
          <span style={{ fontWeight: 700, color: ok(diffCust) ? 'var(--green)' : 'var(--red)' }}>
            {ok(diffCust) ? '✓ Zero' : fmtM(diffCust)}
          </span>
        </div>
      </div>

      {/* Captação */}
      <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 14px', border: `1px solid ${ok(diffCap) ? '#A8DFC8' : '#F0C4B4'}` }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 6 }}>CAPTAÇÃO — Anual 2026</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
          <span style={{ color: 'var(--text3)' }}>Meta time:</span>
          <span style={{ fontWeight: 600 }}>{fmtM(alvoCap)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
          <span style={{ color: 'var(--text3)' }}>Soma indiv.:</span>
          <span style={{ fontWeight: 600 }}>{fmtM(somaCapAnual)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
          <span style={{ fontWeight: 700 }}>Diferença:</span>
          <span style={{ fontWeight: 700, color: ok(diffCap) ? 'var(--green)' : 'var(--red)' }}>
            {ok(diffCap) ? '✓ Zero' : fmtM(diffCap)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Tabela editável
───────────────────────────────────────────────────────────── */
function TabelaMetas({ assessores, dados, setDados, tipo, filtro }) {
  const ativos = assessores.filter(a => a.ativo && (!filtro || a.cidade === filtro));
  const isCust = tipo === 'custodia';

  // Pesos para exibição informativa
  const totalCust = assessores.filter(a => a.ativo).reduce((s, a) => s + (CUSTODIA_FINAL_2025[a.cod] || 0), 0);

  function handleChange(cod, mes, num) {
    setDados(d => {
      const arr = d[cod] ? [...d[cod]] : Array(12).fill(0);
      arr[mes] = num;
      return { ...d, [cod]: arr };
    });
  }

  const totaisMes = MESES.map((_, i) =>
    ativos.reduce((s, a) => s + (dados[a.cod]?.[i] || 0), 0)
  );

  return (
    <div className="table-card editable-table">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 2, minWidth: 240 }}>Assessor</th>
              <th style={{ textAlign: 'right', minWidth: 80, background: '#FFFBF0', color: 'var(--amber)', fontSize: 10 }}>
                Peso %
              </th>
              <th style={{ textAlign: 'right', minWidth: 130, background: '#FFFBF0', color: 'var(--amber)', fontSize: 10 }}>
                Base 2025
              </th>
              <th style={{ textAlign: 'right', minWidth: 130, background: '#F0FAF5', color: 'var(--green)', fontSize: 10 }}>
                {isCust ? 'Alvo Dez/26' : 'Alvo Anual 26'}
              </th>
              {MESES.map((m, i) => (
                <th key={i} style={{ textAlign: 'right', minWidth: 155 }}>{m}/26</th>
              ))}
              <th style={{ textAlign: 'right', minWidth: 130 }}>
                {isCust ? 'Meta Dez/26' : 'Total Anual'}
              </th>
            </tr>
          </thead>
          <tbody>
            {ativos.map(a => {
              const baseCust = CUSTODIA_FINAL_2025[a.cod] || 0;
              const baseCap  = CAPTACAO_TOTAL_2025[a.cod]  || 0;
              const base     = isCust ? baseCust : baseCap;
              const peso     = totalCust > 0 ? baseCust / totalCust : 0;

              // Alvo calculado pela lógica de distribuição
              const totalBase = assessores.filter(x => x.ativo).reduce((s, x) => s + (CUSTODIA_FINAL_2025[x.cod] || 0), 0);
              const totalCapBase = assessores.filter(x => x.ativo).reduce((s, x) => s + (CAPTACAO_TOTAL_2025[x.cod] || 0), 0);
              const alvo = isCust
                ? baseCust + (totalBase * CRESCIMENTO_CUSTODIA_2026 * peso)
                : baseCap  + (totalCapBase * CRESCIMENTO_CAPTACAO_2026 * peso);

              const ultimoMes  = dados[a.cod]?.[11] || 0;
              const totalAnual = MESES.reduce((s, _, i) => s + (dados[a.cod]?.[i] || 0), 0);
              const exibeTotal = isCust ? ultimoMes : totalAnual;

              const deltaAlvo = exibeTotal - alvo;
              const pctAlvo   = alvo !== 0 ? (exibeTotal / alvo) * 100 : null;

              return (
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

                  {/* Peso % */}
                  <td style={{ textAlign: 'right', background: '#FFFBF0', fontSize: 11, color: 'var(--amber)' }}>
                    {fmtPct(peso * 100)}
                  </td>

                  {/* Base 2025 */}
                  <td style={{ textAlign: 'right', background: '#FFFBF0', fontSize: 11, color: 'var(--amber)', fontWeight: 500 }}>
                    {isCust ? fmtMCustodia(base) : <span className={base >= 0 ? 'val-pos' : 'val-neg'}>{fmtM(base)}</span>}
                  </td>

                  {/* Alvo distribuído */}
                  <td style={{ textAlign: 'right', background: '#F0FAF5', fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
                    {isCust ? fmtMCustodia(alvo) : <span className={alvo >= 0 ? 'val-pos' : 'val-neg'}>{fmtM(alvo)}</span>}
                  </td>

                  {/* Meses editáveis com máscara de moeda */}
                  {MESES.map((_, i) => {
                    const v = dados[a.cod]?.[i] || 0;
                    return (
                      <td key={i} style={{ textAlign: 'right', padding: '4px 4px' }}>
                        <CurrencyInput
                          value={v}
                          allowNegative={!isCust}
                          onChange={num => handleChange(a.cod, i, num)}
                        />
                      </td>
                    );
                  })}

                  {/* Meta final (Dez ou anual) vs alvo */}
                  <td style={{ textAlign: 'right', fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: pctAlvo !== null && pctAlvo >= 100 ? 'var(--green)' : pctAlvo !== null && pctAlvo >= 80 ? 'var(--amber)' : 'var(--blue)' }}>
                      {isCust ? fmtMCustodia(exibeTotal) : fmtM(exibeTotal)}
                    </div>
                    {alvo !== 0 && (
                      <div style={{ fontSize: 10, color: Math.abs(deltaAlvo) < 1000 ? 'var(--green)' : 'var(--text3)', marginTop: 1 }}>
                        {Math.abs(deltaAlvo) < 1000 ? '✓ ok' : `${deltaAlvo >= 0 ? '+' : ''}${fmtMCustodia(Math.abs(deltaAlvo)).replace('R$ ', '')} vs alvo`}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Linha de totais */}
            <tr className="total-row">
              <td style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 1 }}>TOTAL TIME</td>
              <td style={{ background: '#FFFBF0', textAlign: 'right', color: 'var(--amber)', fontWeight: 700 }}>100%</td>
              <td style={{ background: '#FFFBF0', textAlign: 'right', color: 'var(--amber)', fontWeight: 700, fontSize: 11 }}>
                {isCust
                  ? fmtMCustodia(ativos.reduce((s, a) => s + (CUSTODIA_FINAL_2025[a.cod] || 0), 0))
                  : fmtM(ativos.reduce((s, a) => s + (CAPTACAO_TOTAL_2025[a.cod] || 0), 0))
                }
              </td>
              <td style={{ background: '#F0FAF5', textAlign: 'right', color: 'var(--green)', fontWeight: 700, fontSize: 11 }}>
                {isCust
                  ? fmtMCustodia(ativos.reduce((s, a) => s + (CUSTODIA_FINAL_2025[a.cod] || 0), 0) * (1 + CRESCIMENTO_CUSTODIA_2026))
                  : fmtM(ativos.reduce((s, a) => s + (CAPTACAO_TOTAL_2025[a.cod] || 0), 0) * (1 + CRESCIMENTO_CAPTACAO_2026))
                }
              </td>
              {totaisMes.map((v, i) => (
                <td key={i} style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontSize: 12 }}>
                  {isCust ? fmtMCustodia(v) : <span className={v >= 0 ? 'val-pos' : 'val-neg'}>{fmtM(v)}</span>}
                </td>
              ))}
              <td style={{ textAlign: 'right', fontFamily: 'Space Grotesk', fontWeight: 700 }}>
                {(() => {
                  const v = isCust ? (totaisMes[11] || 0) : totaisMes.reduce((s, x) => s + x, 0);
                  return isCust ? fmtMCustodia(v) : <span className={v >= 0 ? 'val-pos' : 'val-neg'}>{fmtM(v)}</span>;
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Página principal
───────────────────────────────────────────────────────────── */
export default function Metas() {
  const [assessores]    = useState(getAssessores);
  const [tipo, setTipo] = useState('custodia');
  const [dadosCust, setDadosCust] = useState(getMetasCustodia);
  const [dadosCap,  setDadosCap]  = useState(getMetasCaptacao);
  const [filtro,    setFiltro]    = useState('');
  const [saved,     setSaved]     = useState(false);
  const [gerado,    setGerado]    = useState(false);

  const isCust   = tipo === 'custodia';
  const dados    = isCust ? dadosCust : dadosCap;
  const setDados = isCust ? setDadosCust : setDadosCap;

  const ativos = assessores.filter(a => a.ativo);
  const totalBase = ativos.reduce((s, a) => s + (CUSTODIA_FINAL_2025[a.cod] || 0), 0);
  const totalCap  = ativos.reduce((s, a) => s + (CAPTACAO_TOTAL_2025[a.cod]  || 0), 0);

  function handleGerar() {
    if (isCust) setDadosCust(d => ({ ...d, ...gerarMetasCustodia2026(assessores) }));
    else        setDadosCap(d  => ({ ...d, ...gerarMetasCaptacao2026(assessores) }));
    setGerado(true);
    setTimeout(() => setGerado(false), 2500);
  }

  function handleSave() {
    if (isCust) saveMetasCustodia(dadosCust);
    else        saveMetasCaptacao(dadosCap);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function exportar() {
    const filtrados = assessores.filter(a => a.ativo && (!filtro || a.cidade === filtro));
    const rows = filtrados.map(a => {
      const baseCust = CUSTODIA_FINAL_2025[a.cod] || 0;
      const baseCap  = CAPTACAO_TOTAL_2025[a.cod]  || 0;
      const peso     = totalBase > 0 ? baseCust / totalBase : 0;
      return {
        Código: a.cod, Assessor: a.nome, Cidade: CIDADES[a.cidade],
        'Peso %': (peso * 100).toFixed(2) + '%',
        'Base 2025': isCust ? baseCust : baseCap,
        'Alvo 2026': isCust
          ? baseCust + totalBase * CRESCIMENTO_CUSTODIA_2026 * peso
          : baseCap  + totalCap  * CRESCIMENTO_CAPTACAO_2026 * peso,
        ...Object.fromEntries(MESES.map((m, i) => [`${m}/26`, dados[a.cod]?.[i] || 0])),
        Total: MESES.reduce((s, _, i) => s + (dados[a.cod]?.[i] || 0), 0),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Metas ${isCust ? 'Custódia' : 'Captação'}`);
    XLSX.writeFile(wb, `metas_${tipo}_2026.xlsx`);
  }

  return (
    <>
      {/* ── KPIs ── */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--amber)' }}>
          <div className="kpi-label">Base Custódia Dez/2025</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{fmtMCustodia(totalBase)}</div>
          <div className="kpi-sub">posição final do time</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--blue)' }}>
          <div className="kpi-label">Meta Custódia Dez/2026</div>
          <div className="kpi-value" style={{ color: 'var(--blue)', fontSize: 18 }}>{fmtMCustodia(totalBase * 1.21)}</div>
          <div className="kpi-sub">+21% → delta +{fmtMCustodia(totalBase * 0.21)}</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--amber)' }}>
          <div className="kpi-label">Base Captação 2025</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{fmtM(totalCap)}</div>
          <div className="kpi-sub">saldo líquido anual do time</div>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--green)' }}>
          <div className="kpi-label">Meta Captação Anual 2026</div>
          <div className="kpi-value" style={{ color: 'var(--green)', fontSize: 18 }}>{fmtM(totalCap * 1.25)}</div>
          <div className="kpi-sub">+25% → delta +{fmtM(totalCap * 0.25)}</div>
        </div>
      </div>

      {/* ── Validação ── */}
      <PainelValidacao assessores={assessores} dadosCust={dadosCust} dadosCap={dadosCap} />

      {/* ── Controles ── */}
      <div className="filters-bar">
        <div className="toggle-group">
          <button className={`toggle-btn ${isCust ? 'active' : ''}`} onClick={() => setTipo('custodia')}>
            <i className="ti ti-building-bank" style={{ marginRight: 4 }} />Custódia
          </button>
          <button className={`toggle-btn ${!isCust ? 'active' : ''}`} onClick={() => setTipo('captacao')}>
            <i className="ti ti-trending-up" style={{ marginRight: 4 }} />Captação
          </button>
        </div>
        <select value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todas as cidades</option>
          {Object.entries(CIDADES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={handleGerar}>
            <i className={`ti ${gerado ? 'ti-check' : 'ti-wand'}`} />
            {gerado ? 'Gerado!' : `Gerar metas ${isCust ? 'custódia' : 'captação'} 2026`}
          </button>
          <button className="btn btn-outline" onClick={exportar}>
            <i className="ti ti-file-spreadsheet" /> Excel
          </button>
          <button className="btn btn-success" onClick={handleSave}>
            <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} />
            {saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* ── Nota da lógica ── */}
      <div style={{
        background: isCust ? '#EAF1FB' : '#EAF7F1',
        border: `1px solid ${isCust ? '#B8D0EF' : '#A8DFC8'}`,
        borderRadius: 10, padding: '10px 16px', marginBottom: 16,
        fontSize: 12, color: isCust ? '#0D3B72' : '#0A4D31', lineHeight: 1.8,
      }}>
        {isCust ? (
          <>
            <strong>📐 Lógica custódia:</strong> Delta time = R$ {fmtMCustodia(totalBase * 0.21)} (+21%)
            → distribuído pelo peso da carteira de cada assessor
            → progressão linear Jan (+1,75%) → Dez (+21%) <br />
            <span style={{ opacity: 0.8 }}>Soma das metas individuais em Dez = meta do time em Dez/2026 ✓</span>
          </>
        ) : (
          <>
            <strong>📐 Lógica captação:</strong> Delta time = {fmtM(totalCap * 0.25)} (+25%)
            → distribuído pelo peso da carteira (custódia) de cada assessor
            → parcela mensal fixa = alvo anual ÷ 12 <br />
            <span style={{ opacity: 0.8 }}>Assessores com captação negativa em 2025 recebem meta proporcional ao seu livro (não ao histórico negativo). Soma das metas individuais = meta do time ✓</span>
          </>
        )}
      </div>

      <TabelaMetas
        assessores={assessores}
        dados={dados}
        setDados={setDados}
        tipo={tipo}
        filtro={filtro}
      />
    </>
  );
}
