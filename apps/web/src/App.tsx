import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './features/landing/LandingPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ResidentialWizardPage } from './features/wizard/ResidentialWizardPage';
import { WorkspacePage } from './features/workspace/WorkspacePage';

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
        </Routes>
      </main>
    </div>
  );
};
