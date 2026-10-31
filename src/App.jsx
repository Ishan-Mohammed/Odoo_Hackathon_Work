import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import ToastConfig from './components/ui/ToastConfig';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastConfig />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
