import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { MESES_FULL } from '../data/dados';

const NAV = [
  { to: '/dashboard',           icon: 'ti-layout-dashboard', label: 'Dashboard Geral' },
  { to: '/dashboard-assessor',  icon: 'ti-user-search',      label: 'Dashboard Assessor' },
  { to: '/assessores',          icon: 'ti-users',             label: 'Assessores' },
  { to: '/custodia',       icon: 'ti-building-bank',     label: 'Custódia' },
  { to: '/captacao',       icon: 'ti-trending-up',       label: 'Captação' },
  { to: '/metas',          icon: 'ti-target',            label: 'Metas' },
  { to: '/acompanhamento',  icon: 'ti-chart-bar',         label: 'Acompanhamento' },
  { to: '/fluxo-captacao', icon: 'ti-arrows-exchange',   label: 'Fluxo Captação' },
];

const PAGE_TITLES = {
  '/dashboard':           'Dashboard Geral',
  '/dashboard-assessor':  'Dashboard Assessor',
  '/assessores':          'Assessores',
  '/custodia':       'Custódia',
  '/captacao':       'Captação Líquida',
  '/metas':          'Metas',
  '/acompanhamento':  'Acompanhamento',
  '/fluxo-captacao':  'Fluxo de Captação',
};

export default function Layout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const title = PAGE_TITLES[location.pathname] || 'Gestão Comercial';
  const now = new Date();
  const dateStr = `${now.getDate()} de ${MESES_FULL[now.getMonth()]} de ${now.getFullYear()}`;

  return (
    <div className={`app-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>Bequest Capital</h2>
          <p>Gestão Comercial</p>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              title={collapsed ? n.label : undefined}
            >
              <i className={`ti ${n.icon}`} />
              <span className="nav-label">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="nav-footer-text">
            XC Assessoria Financeira<br />Afiliada XP Investimentos
          </div>
        </div>

        {/* Botão de recolher */}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-left'}`} />
        </button>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h1>{title}</h1>
          <span className="topbar-date">{dateStr}</span>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
