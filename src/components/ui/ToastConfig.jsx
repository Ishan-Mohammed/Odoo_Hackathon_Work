import React from 'react';
import { Toaster } from 'react-hot-toast';

export default function ToastConfig() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        className: 'text-sm font-medium',
        style: {
          background: '#0f172a', // Slate 900
          color: '#f8fafc', // Slate 50
          borderRadius: '12px',
          padding: '12px 16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)',
        },
        success: {
          iconTheme: {
            primary: '#10b981', // emerald
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444', // rose
            secondary: '#ffffff',
          },
        },
      }}
    />
  );
}
