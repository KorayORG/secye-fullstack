import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import CorporatePanel from './components/CorporatePanel';
import IndividualPanel from './components/IndividualPanel';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/:encUserId/:encCompanyType/:encCompanyId/:page" element={<CorporatePanel />} />
          <Route path="/app/*" element={<IndividualPanel />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;