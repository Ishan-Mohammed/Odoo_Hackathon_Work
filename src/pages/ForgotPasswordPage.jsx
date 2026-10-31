import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, RotateCw } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { forgotPassword } from '../api/auth';

export default function ForgotPasswordPage() {
  const emailInputRef = useRef(null);

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Resend cooldown timer
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isSubmitted) {
      emailInputRef.current?.focus();
    }
  }, [isSubmitted]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const validate = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('Email address is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      await forgotPassword({ email: email.trim() });
      setIsSubmitted(true);
      setCountdown(60); // 60s cooldown
      toast.success('Reset link dispatched!');
    } catch (err) {
      // Security best practice: Don't leak errors, show success view anyway or generic error
      setIsSubmitted(true);
      setCountdown(60);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0 || isLoading) return;
    handleSubmit();
  };

  return (
    <AuthLayout
      title={isSubmitted ? 'Check your inbox' : 'Forgot your password?'}
      subtitle={
        isSubmitted
          ? 'We have sent password reset instructions to your address'
          : "Enter your email and we'll send you a secure reset link"
      }
      footerLink={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>
      }
    >
      {!isSubmitted ? (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input
            ref={emailInputRef}
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            disabled={isLoading}
            required
            errorMessage={errorMessage}
            leftIcon={<Mail className="w-4 h-4" />}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage('');
            }}
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Send reset link
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-5 text-center animate-fade-in py-2">
          {/* Animated Mail icon badge */}
          <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center mx-auto shadow-soft-sm">
            <Mail className="w-8 h-8 text-brand-600" />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-600 leading-relaxed">
              If an account exists for{' '}
              <strong className="text-slate-900 font-semibold break-all px-1.5 py-0.5 rounded bg-slate-100">
                {email}
              </strong>
              , you will receive an email with instructions to reset your password.
            </p>
            <p className="text-xs text-slate-400">
              For security, this link expires in 15 minutes.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <p className="text-xs text-slate-500">
              Didn't receive the email? Check your spam folder or try again.
            </p>

            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              disabled={countdown > 0 || isLoading}
              onClick={handleResend}
              leftIcon={<RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              {countdown > 0 ? `Resend email in ${countdown}s` : 'Resend reset link'}
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
