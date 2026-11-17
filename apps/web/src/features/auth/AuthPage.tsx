import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthModal } from './AuthModal';

export const AuthPage: React.FC<{ initialMode?: 'login' | 'signup' }> = ({ initialMode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const mode = initialMode || (location.pathname.includes('signup') ? 'signup' : 'login');

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-950 p-4">
      <AuthModal
        isOpen={true}
        initialMode={mode}
        onClose={() => navigate('/')}
        onSuccess={() => navigate('/dashboard')}
      />
    </div>
  );
};
