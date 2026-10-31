import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import Button from '../components/ui/Button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-6">
        <Logo theme="dark" />
      </div>
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-soft-lg">
        <span className="text-5xl font-black text-brand-600 tracking-tight block mb-2">
          404
        </span>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Page Not Found</h1>
        <p className="text-sm text-slate-600 mb-6">
          The requested page does not exist or may have been relocated.
        </p>
        <Link to="/login">
          <Button variant="primary" fullWidth leftIcon={<Home className="w-4 h-4" />}>
            Back to Brightloop
          </Button>
        </Link>
      </div>
    </div>
  );
}
