import { useState } from 'react';
import { getAssessores, setAssessores } from '../data/store.js';
import { COR_CIDADE, CIDADES } from '../data/dados.js';
import { initials } from '../utils/fmt.js';

const BLANK = { cod:'', nome:'', cidade:'JP', ativo:true };

export default function Assessores() {
  const [lista, setLista] = useState(getAssessores());
  const [filtro, setFiltro] = useState('');
  const [cidFiltro, setCidFiltro] = useState('');
  const [modal, setModal] = useState(null); // null | {modo, dados}

  const save = (l) => { setLista(l); setAssessores(l); };

  const filtrado = lista.filter(a => {
    if (cidFiltro && a.cidade !== cidFiltro) return false;
    if (filtro && !a.nome.toLowerCase().includes(filtro.toLowerCase()) && !a.cod.toLowerCase().includes(filtro.toLowerCase())) return false;
    return true;
  });

  const handleSave = (dados) => {
    if (modal.modo === 'novo') {
      save([...lista, dados]);
    } else {
      save(lista.map(a => a.cod === modal.dados.cod ? dados : a));
    }
    setModal(null);
  };

  const handleRemove = (cod) => {
    if (confirm('Remover assessor?')) save(lista.filter(a => a.cod !== cod));
  };

  const contPorCidade = Object.keys(CIDADES).map(c => ({
    c, n: lista.filter(a => a.cidade === c && a.ativo).length
  }));

  return (
    <div>
      <div className="kpi-row" style={{marginBottom:16}}>
        {contPorCidade.map(({c, n}) => (
          <div key={c} className="kpi-card" style={{borderTop:`3px solid ${COR_CIDADE[c]}`}}>
            <div className="kpi-label">{CIDADES[c]}</div>
            <div className="kpi-value">{n}</div>
            <div className="kpi-sub">assessores ativos</div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Buscar por nome ou código..." value={filtro} onChange={e=>setFiltro(e.target.value)}/>
        <select className="select-sm" value={cidFiltro} onChange={e=>setCidFiltro(e.target.value)}>
          <option value="">Todas as cidades</option>
          {Object.entries(CIDADES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-primary" onClick={()=>setModal({modo:'novo',dados:{...BLANK}})}>
          <i className="ti ti-plus"></i> Novo Assessor
        </button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead><tr><th>Assessor</th><th>Código</th><th>Cidade</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {filtrado.map(a => (
              <tr key={a.cod}>
                <td>
                  <div className="assessor-cell">
                    <span className="avatar" style={{background:COR_CIDADE[a.cidade]+'33',color:COR_CIDADE[a.cidade]}}>{initials(a.nome)}</span>
                    <span className="assessor-nome">{a.nome}</span>
                  </div>
                </td>
                <td><code>{a.cod}</code></td>
                <td><span className="city-pill" style={{background:COR_CIDADE[a.cidade]+'22',color:COR_CIDADE[a.cidade]}}>{CIDADES[a.cidade]}</span></td>
                <td><span className={`status-pill ${a.ativo?'green':'red'}`}>{a.ativo?'Ativo':'Inativo'}</span></td>
                <td>
                  <button className="btn-icon" onClick={()=>setModal({modo:'editar',dados:{...a}})} title="Editar"><i className="ti ti-pencil"></i></button>
                  <button className="btn-icon danger" onClick={()=>handleRemove(a.cod)} title="Remover"><i className="ti ti-trash"></i></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal.modo==='novo'?'Novo Assessor':'Editar Assessor'}</h2>
              <button className="btn-icon" onClick={()=>setModal(null)}><i className="ti ti-x"></i></button>
            </div>
            <ModalForm dados={modal.dados} onSave={handleSave} onCancel={()=>setModal(null)}/>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalForm({ dados, onSave, onCancel }) {
  const [form, setForm] = useState({...dados});
  const set = (k, v) => setForm(f => ({...f, [k]:v}));
  return (
    <div className="modal-body">
      <div className="form-group"><label>Código</label>
        <input className="form-input" value={form.cod} onChange={e=>set('cod',e.target.value)} placeholder="Ex: A12345"/>
      </div>
      <div className="form-group"><label>Nome</label>
        <input className="form-input" value={form.nome} onChange={e=>set('nome',e.target.value)} placeholder="Nome completo"/>
      </div>
      <div className="form-group"><label>Cidade</label>
        <select className="form-input" value={form.cidade} onChange={e=>set('cidade',e.target.value)}>
          {Object.entries(CIDADES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="form-group"><label>Status</label>
        <select className="form-input" value={form.ativo?'1':'0'} onChange={e=>set('ativo',e.target.value==='1')}>
          <option value="1">Ativo</option>
          <option value="0">Inativo</option>
        </select>
      </div>
      <div className="modal-actions">
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" onClick={()=>onSave(form)}>Salvar</button>
      </div>
    </div>
  );
}
