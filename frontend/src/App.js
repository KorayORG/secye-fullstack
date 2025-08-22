import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import CorporatePanel from './components/CorporatePanel';
import CateringPanel from './components/CateringPanel';
import SupplierPanel from './components/SupplierPanel';
import IndividualPanel from './components/IndividualPanel';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import PanelRouter from './components/PanelRouter';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPanel />} />
          {/* Test routes for development */}
          <Route path="/corporate" element={<CorporatePanel />} />
          <Route path="/catering" element={<CateringPanel />} />
          <Route path="/supplier" element={<SupplierPanel />} />
          <Route path="/:encUserId/:encCompanyType/:encCompanyId/:page" element={<PanelRouter />} />
          <Route path="/app/*" element={<IndividualPanel />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;