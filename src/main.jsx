import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Assessores from './pages/Assessores.jsx';
import Custodia from './pages/Custodia.jsx';
import Captacao from './pages/Captacao.jsx';
import Metas from './pages/Metas.jsx';
import Acompanhamento from './pages/Acompanhamento.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/"               element={<Dashboard/>}/>
          <Route path="/assessores"     element={<Assessores/>}/>
          <Route path="/custodia"       element={<Custodia/>}/>
          <Route path="/captacao"       element={<Captacao/>}/>
          <Route path="/metas"          element={<Metas/>}/>
          <Route path="/acompanhamento" element={<Acompanhamento/>}/>
        </Routes>
      </Layout>
    </HashRouter>
  </React.StrictMode>
);
