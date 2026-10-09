import { NavLink, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/',              icon: 'ti-dashboard',    label: 'Dashboard' },
  { to: '/assessores',    icon: 'ti-users',         label: 'Assessores' },
  { to: '/custodia',      icon: 'ti-chart-bar',     label: 'Custódia' },
  { to: '/captacao',      icon: 'ti-trending-up',   label: 'Captação' },
  { to: '/metas',         icon: 'ti-target',        label: 'Metas' },
  { to: '/acompanhamento',icon: 'ti-eye',           label: 'Acompanhamento' },
];

export default function Layout({ children }) {
  const loc = useLocation();
  const current = NAV.find(n => n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">BC</div>
          <div>
            <div className="brand-name">Bequest Capital</div>
            <div className="brand-sub">Gestão Comercial</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to==='/'} className={({isActive})=>`nav-item${isActive?' active':''}`}>
              <i className={`ti ${n.icon}`}></i>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>© 2026 Bequest Capital</span>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <h1 className="page-title">{current?.label || 'Painel'}</h1>
          <span className="topbar-date">{new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
