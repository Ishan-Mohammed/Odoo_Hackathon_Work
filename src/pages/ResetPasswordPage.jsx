import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import PasswordChecklist, { isPasswordValid } from '../components/ui/PasswordChecklist';
import { resetPassword } from '../api/auth';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const newPasswordRef = useRef(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(
    token === 'expired' || token === 'invalid'
      ? 'This password reset link has expired or has already been used.'
      : ''
  );

  useEffect(() => {
    if (!tokenError && !isSuccess) {
      newPasswordRef.current?.focus();
    }
  }, [tokenError, isSuccess]);

  const isPwdValid = isPasswordValid(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isFormValid = isPwdValid && passwordsMatch;

  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid) return;

    setIsLoading(true);
    setErrors({});

    try {
      await resetPassword({ token, password });
      toast.success('Password updated successfully!');
      setIsSuccess(true);
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Unable to reset password. The link may have expired.';
      if (err.response?.status === 400 || msg.toLowerCase().includes('expired')) {
        setTokenError(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // If token is invalid or expired
  if (tokenError) {
    return (
      <AuthLayout
        title="Link expired"
        subtitle="This password recovery link is no longer valid"
      >
        <div className="space-y-6 text-center animate-fade-in py-2">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shadow-soft-xs">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-base font-bold text-slate-900">
              Reset link expired
            </h3>
            <p className="text-[14px] text-slate-600 leading-relaxed font-sans">
              {tokenError}
            </p>
            <p className="text-xs text-slate-400">
              Reset links can only be used once and expire for your account's protection.
            </p>
          </div>

          <div className="pt-2">
            <Link to="/forgot-password">
              <Button variant="primary" size="lg" fullWidth>
                Request a new reset link
              </Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // If password successfully updated
  if (isSuccess) {
    return (
      <AuthLayout
        title="Password updated"
        subtitle="Your Brightloop account credentials have been updated"
      >
        <div className="space-y-6 text-center animate-fade-in py-2">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-pulse-ring" />
            <div className="relative w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shadow-soft-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-base font-bold text-slate-900">
              Ready to sign in
            </h3>
            <p className="text-[14px] text-slate-600 leading-relaxed font-sans">
              Your password has been changed successfully. You can now access your account using your new credentials.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate('/login', { replace: true })}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Continue to sign in
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong, unique password for your account"
      footerLink={
        <Link
          to="/login"
          className="font-medium text-brand-600 hover:text-brand-700 hover:underline transition-colors"
        >
          Cancel and return to sign in
        </Link>
      }
    >
      <form onSubmit={handleResetSubmit} noValidate className="space-y-4">
        {/* New Password */}
        <div>
          <PasswordInput
            ref={newPasswordRef}
            label="New password"
            placeholder="Enter new password"
            autoComplete="new-password"
            value={password}
            disabled={isLoading}
            required
            errorMessage={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
          />

          {/* Compact PasswordChecklist */}
          <div className="mt-2.5">
            <PasswordChecklist password={password} />
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <PasswordInput
            label="Confirm new password"
            placeholder="Repeat new password"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={isLoading}
            required
            errorMessage={
              confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined
            }
            success={confirmPassword.length > 0 && password === confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={!isFormValid || isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Update password
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
