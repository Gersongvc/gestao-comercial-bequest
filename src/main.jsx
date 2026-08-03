import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Assessores from './pages/Assessores';
import Custodia from './pages/Custodia';
import Captacao from './pages/Captacao';
import Metas from './pages/Metas';
import Acompanhamento from './pages/Acompanhamento';
import DashboardAssessor from './pages/DashboardAssessor';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="assessores" element={<Assessores />} />
          <Route path="custodia" element={<Custodia />} />
          <Route path="captacao" element={<Captacao />} />
          <Route path="metas" element={<Metas />} />
          <Route path="acompanhamento" element={<Acompanhamento />} />
          <Route path="dashboard-assessor" element={<DashboardAssessor />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
