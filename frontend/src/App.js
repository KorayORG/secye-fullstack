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
import ProtectedRoute from './components/ProtectedRoute';
import IndividualLayout from './components/individual/IndividualLayout';
import IndividualDashboard from './components/individual/IndividualDashboard';
import MealSelection from './components/individual/MealSelection';
import MySelections from './components/individual/MySelections';
import RequestSuggestion from './components/individual/RequestSuggestion';
import Profile from './components/individual/Profile';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminPanel />} />
          
          {/* Corporate/Catering/Supplier Panel Routes (existing) */}
          <Route path="/:encUserId/:encCompanyType/:encCompanyId/:page" element={<PanelRouter />} />
          
          {/* Individual User Routes (new encrypted routing) */}
          <Route 
            path="/:encCompanyId/:encUserId/dashboard" 
            element={
              <ProtectedRoute>
                <IndividualLayout>
                  <IndividualDashboard />
                </IndividualLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/:encCompanyId/:encUserId/secim" 
            element={
              <ProtectedRoute>
                <IndividualLayout>
                  <MealSelection />
                </IndividualLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/:encCompanyId/:encUserId/sectiklerim" 
            element={
              <ProtectedRoute>
                <IndividualLayout>
                  {/* TODO: Create MySelections component */}
                  <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Seçtiklerim</h2>
                    <p className="text-gray-600">Bu sayfa yakında tamamlanacak...</p>
                  </div>
                </IndividualLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/:encCompanyId/:encUserId/istek-oneri" 
            element={
              <ProtectedRoute>
                <IndividualLayout>
                  {/* TODO: Create RequestSuggestion component */}
                  <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">İstek & Öneri</h2>
                    <p className="text-gray-600">Bu sayfa yakında tamamlanacak...</p>
                  </div>
                </IndividualLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/:encCompanyId/:encUserId/hesabim" 
            element={
              <ProtectedRoute>
                <IndividualLayout>
                  {/* TODO: Create Profile component */}
                  <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Hesabım</h2>
                    <p className="text-gray-600">Bu sayfa yakında tamamlanacak...</p>
                  </div>
                </IndividualLayout>
              </ProtectedRoute>
            } 
          />

          {/* Legacy Individual Panel Route (fallback) */}
          <Route path="/app/*" element={<IndividualPanel />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;