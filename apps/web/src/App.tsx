import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './features/landing/LandingPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ResidentialWizardPage } from './features/wizard/ResidentialWizardPage';
import { WorkspacePage } from './features/workspace/WorkspacePage';
import { AuthPage } from './features/auth/AuthPage';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/wizard" element={<ResidentialWizardPage />} />
          <Route path="/workspace/:id" element={<WorkspacePage />} />
          <Route path="/login" element={<AuthPage initialMode="login" />} />
          <Route path="/signup" element={<AuthPage initialMode="signup" />} />
        </Routes>
      </main>
    </div>
  );
};
