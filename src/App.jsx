import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { IntroProvider } from './components/auth/IntroContext';
import AppRoutes from './routes/AppRoutes';
import ToastConfig from './components/ui/ToastConfig';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <IntroProvider>
          <ToastConfig />
          <AppRoutes />
        </IntroProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
