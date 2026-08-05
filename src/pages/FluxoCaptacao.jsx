import { useState } from 'react';
import {
  MESES, CIDADES, COR_CIDADE, COR_BG,
  APORTE_INICIAL, RESGATE_INICIAL, CAPTACAO_INICIAL,
} from '../data/dados';
import { getAssessores } from '../data/store';
import { fmtM, iniciais } from '../utils/fmt';

const MESES_DISP = MESES.slice(0, 7);

/* ── Tabela mês a mês com sub-linhas Aporte / Resgate / Líquido ── */
const LINHAS = [
  { key: 'aporte',  label: 'Aporte',  src: APORTE_INICIAL,   cor: '#1D9E75', sinal: 1  },
  { key: 'resgate', label: 'Resgate', src: RESGATE_INICIAL,  cor: '#D85A30', sinal: -1 },
  { key: 'liquido', label: 'Líquido', src: CAPTACAO_INICIAL, cor: null,      sinal: 1  },
];

const tdNum = (cor) => ({
  textAlign: 'right', fontSize: 11, padding: '4px 8px', color: cor, fontWeight: 500,
});

function AssessorRows({ a, meses }) {
  return (
    <>
      {LINHAS.map((l, li) => {
        const vals  = meses.map((_, i) => {
          const v = l.src[a.cod]?.[i] || 0;
          return l.sinal === -1 ? -Math.abs(v) : v;
        });
        const total = vals.reduce((s, v) => s + v, 0);
        const cor   = l.cor || (total >= 0 ? '#1D9E75' : '#D85A30');
        const isFirst = li === 0;
        return (
          <tr
            key={`${a.cod}-${l.key}`}
            style={{
              borderTop: isFirst ? '2px solid var(--border)' : undefined,
              background: li === LINHAS.length - 1 ? 'rgba(0,0,0,0.02)' : 'inherit',
            }}
          >
            {isFirst && (
              <td
                rowSpan={LINHAS.length}
                style={{ position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1, verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}
              >
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
            )}
            <td style={{ fontSize: 11, padding: '4px 8px', color: l.cor || 'var(--text2)', fontWeight: 600, whiteSpace: 'nowrap', borderRight: '1px solid var(--border)' }}>
              {l.label}
            </td>
            {vals.map((v, i) => (
              <td key={i} style={tdNum(l.cor || (v >= 0 ? '#1D9E75' : '#D85A30'))}>
                {v === 0 ? <span style={{ color: 'var(--text3)' }}>—</span> : fmtM(v)}
              </td>
            ))}
            <td style={{ ...tdNum(cor), fontWeight: 700, borderLeft: '1px solid var(--border)' }}>{fmtM(total)}</td>
          </tr>
        );
      })}
    </>
  );
}

function TabelaMesMes({ ativos, meses }) {
  const thStyle = { textAlign: 'right', minWidth: 115, fontSize: 11, padding: '6px 8px' };

  const totalTime = LINHAS.map(l =>
    meses.map((_, i) => ativos.reduce((s, a) => {
      const v = l.src[a.cod]?.[i] || 0;
      return s + (l.sinal === -1 ? -Math.abs(v) : v);
    }, 0))
  );

  return (
    <div className="table-card" style={{ marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--border)' }}>
        Aporte · Resgate · Líquido por Assessor — Mês a Mês
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 2, minWidth: 200 }}>Assessor</th>
              <th style={{ minWidth: 72, background: 'var(--surface2)', fontSize: 11 }}></th>
              {meses.map(m => <th key={m} style={thStyle}>{m}</th>)}
              <th style={{ ...thStyle, fontWeight: 700 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {ativos.map(a => <AssessorRows key={a.cod} a={a} meses={meses} />)}
          </tbody>
          <tbody>
            {LINHAS.map((l, li) => {
              const totais = totalTime[li];
              const totalG = totais.reduce((s, v) => s + v, 0);
              const cor    = l.cor || (totalG >= 0 ? '#1D9E75' : '#D85A30');
              return (
                <tr
                  key={`total-${l.key}`}
                  style={{ background: 'var(--surface2)', borderTop: li === 0 ? '2px solid var(--border)' : undefined }}
                >
                  {li === 0 && (
                    <td
                      rowSpan={LINHAS.length}
                      style={{ position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 1, fontWeight: 700, fontSize: 12, verticalAlign: 'middle', borderRight: '1px solid var(--border)' }}
                    >
                      TOTAL TIME
                    </td>
                  )}
                  <td style={{ fontSize: 11, padding: '4px 8px', color: l.cor || 'var(--text2)', fontWeight: 600, borderRight: '1px solid var(--border)' }}>{l.label}</td>
                  {totais.map((v, i) => (
                    <td key={i} style={tdNum(l.cor || (v >= 0 ? '#1D9E75' : '#D85A30'))}>{fmtM(v)}</td>
                  ))}
                  <td style={{ ...tdNum(cor), fontWeight: 700, borderLeft: '1px solid var(--border)' }}>{fmtM(totalG)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Página principal ── */
export default function FluxoCaptacao() {
  const assessores = getAssessores().filter(a => a.ativo);
  const [filtro, setFiltro] = useState('');

  const ativos = assessores.filter(a => !filtro || a.cidade === filtro);

  const totAporte  = MESES_DISP.map((_, i) => ativos.reduce((s, a) => s + (APORTE_INICIAL[a.cod]?.[i]  || 0), 0));
  const totResgate = MESES_DISP.map((_, i) => ativos.reduce((s, a) => s + (RESGATE_INICIAL[a.cod]?.[i] || 0), 0));
  const totLiq     = MESES_DISP.map((_, i) => totAporte[i] + totResgate[i]);

  const somaAporte  = totAporte.reduce((s, v) => s + v, 0);
  const somaResgate = totResgate.reduce((s, v) => s + Math.abs(v), 0);
  const somaLiq     = totLiq.reduce((s, v) => s + v, 0);
  const taxaRet     = somaAporte > 0 ? ((somaAporte - somaResgate) / somaAporte) * 100 : 0;



  return (
    <>
      {/* Filtro */}
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <select value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todas as cidades</option>
          {Object.entries(CIDADES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Aporte (Jan–Jul)',  val: fmtM(somaAporte),        color: '#1D9E75' },
          { label: 'Total Resgate (Jan–Jul)', val: fmtM(-somaResgate),       color: '#D85A30' },
          { label: 'Captação Líquida',        val: fmtM(somaLiq),            color: somaLiq >= 0 ? '#185FA5' : '#D85A30' },
          { label: 'Taxa de Retenção',        val: `${taxaRet.toFixed(1)}%`, color: taxaRet >= 0 ? '#7F77DD' : '#D85A30' },
        ].map(k => (
          <div key={k.label} className="table-card" style={{ padding: '14px 18px', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: 'Space Grotesk' }}>{k.val}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabela mês a mês */}
      <TabelaMesMes ativos={ativos} meses={MESES_DISP} />
    </>
  );
}
