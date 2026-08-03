import { useState } from 'react';
import { CIDADES, COR_CIDADE, COR_BG } from '../data/dados';
import { getAssessores, saveAssessores } from '../data/store';
import { iniciais } from '../utils/fmt';

const EMPTY = { cod: '', nome: '', cidade: 'JP', ativo: true };

export default function Assessores() {
  const [assessores, setAssessores] = useState(getAssessores);
  const [filtro, setFiltro] = useState('');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const salvar = (list) => { setAssessores(list); saveAssessores(list); };

  const filtrados = assessores.filter(a => {
    const busca = filtro.toLowerCase();
    const matchNome = a.nome.toLowerCase().includes(busca) || a.cod.toLowerCase().includes(busca);
    const matchCidade = !filtroCidade || a.cidade === filtroCidade;
    return matchNome && matchCidade;
  });

  function abrirNovo() { setForm({ ...EMPTY }); setModal('novo'); }
  function abrirEditar(a) { setForm({ ...a }); setModal('editar'); }

  function confirmarModal() {
    if (!form.cod.trim() || !form.nome.trim()) return;
    let novo;
    if (modal === 'novo') {
      if (assessores.find(a => a.cod === form.cod)) {
        alert('Código já existe'); return;
      }
      novo = [...assessores, { ...form }];
    } else {
      novo = assessores.map(a => a.cod === form.cod ? { ...form } : a);
    }
    salvar(novo);
    setModal(null);
  }

  function remover(cod) {
    if (!confirm('Remover este assessor?')) return;
    salvar(assessores.filter(a => a.cod !== cod));
  }

  const contPorCidade = Object.fromEntries(
    Object.keys(CIDADES).map(c => [c, assessores.filter(a => a.cidade === c && a.ativo).length])
  );

  return (
    <>
      <div className="kpi-grid">
        {Object.entries(CIDADES).map(([cod, nome]) => (
          <div key={cod} className="kpi-card" style={{ borderLeft: `4px solid ${COR_CIDADE[cod]}` }}>
            <div className="kpi-label">{nome}</div>
            <div className="kpi-value" style={{ color: COR_CIDADE[cod] }}>{contPorCidade[cod]}</div>
            <div className="kpi-sub">assessores ativos</div>
          </div>
        ))}
      </div>

      <div className="filters-bar">
        <input
          placeholder="Buscar nome ou código..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={{ width: 240 }}
        />
        <select value={filtroCidade} onChange={e => setFiltroCidade(e.target.value)}>
          <option value="">Todas as cidades</option>
          {Object.entries(CIDADES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
        <button className="btn btn-primary" onClick={abrirNovo} style={{ marginLeft: 'auto' }}>
          <i className="ti ti-plus" /> Novo Assessor
        </button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Assessor</th>
              <th>Código</th>
              <th>Cidade</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(a => (
              <tr key={a.cod}>
                <td>
                  <div className="assessor-cell">
                    <div className="avatar" style={{ background: a.ativo ? COR_CIDADE[a.cidade] : '#C8CFE0' }}>
                      {iniciais(a.nome)}
                    </div>
                    <span style={{ fontWeight: 500 }}>{a.nome}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text3)', fontFamily: 'monospace' }}>{a.cod}</td>
                <td>
                  <span className="cidade-pill" style={{ background: COR_BG[a.cidade], color: COR_CIDADE[a.cidade] }}>
                    {CIDADES[a.cidade]}
                  </span>
                </td>
                <td>
                  <span className={`badge ${a.ativo ? 'badge-green' : 'badge-gray'}`}>
                    {a.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => abrirEditar(a)} style={{ marginRight: 6 }}>
                    <i className="ti ti-edit" /> Editar
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => remover(a.cod)}>
                    <i className="ti ti-trash" />
                  </button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Nenhum assessor encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{modal === 'novo' ? 'Novo Assessor' : 'Editar Assessor'}</h3>
            <div className="form-group">
              <label>Código</label>
              <input value={form.cod} onChange={e => setForm(f => ({ ...f, cod: e.target.value }))} disabled={modal === 'editar'} placeholder="A00000" />
            </div>
            <div className="form-group">
              <label>Nome completo</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do assessor" />
            </div>
            <div className="form-group">
              <label>Cidade</label>
              <select value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}>
                {Object.entries(CIDADES).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.ativo ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, ativo: e.target.value === 'true' }))}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarModal}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
