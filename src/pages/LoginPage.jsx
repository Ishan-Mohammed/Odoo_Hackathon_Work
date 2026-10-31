import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, AlertCircle, ArrowRight } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useIntro } from '../components/auth/IntroContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { introDone } = useIntro();
  const navigate = useNavigate();
  const location = useLocation();

  const emailInputRef = useRef(null);

  // Form State: clean initial state without prefilled placeholder credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [bannerError, setBannerError] = useState('');

  // Autofocus the email field on initial mount once intro finishes
  useEffect(() => {
    if (introDone) {
      emailInputRef.current?.focus();
    }
  }, [introDone]);

  const validate = () => {
    const newErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    setBannerError('');

    try {
      const data = await login({ email: email.trim(), password });
      toast.success(`Welcome back, ${data.user?.name || 'User'}!`);

      // Trigger ~320ms exit animation before redirecting
      setIsLeaving(true);
      await new Promise((resolve) => setTimeout(resolve, 320));

      const userRole = data.user?.role || 'customer';
      const defaultHome = userRole === 'customer' ? '/portal' : '/dashboard';

      // Check whether previous location is permitted for this role
      const returnUrl = location.state?.from?.pathname;
      let targetUrl = defaultHome;

      if (returnUrl) {
        const cleanPath = returnUrl.toLowerCase();
        if (userRole === 'customer') {
          // Customers are strictly isolated to customer portal routes
          if (cleanPath.startsWith('/portal')) {
            targetUrl = returnUrl;
          }
        } else if (userRole === 'staff') {
          // Staff cannot access customer portal or admin-only config
          const adminOnlyRoutes = ['/staff', '/discounts', '/taxes', '/settings'];
          const isForbidden =
            cleanPath.startsWith('/portal') ||
            adminOnlyRoutes.some((r) => cleanPath.startsWith(r));
          if (!isForbidden) {
            targetUrl = returnUrl;
          }
        } else if (userRole === 'admin') {
          // Admin cannot land on customer portal
          if (!cleanPath.startsWith('/portal')) {
            targetUrl = returnUrl;
          }
        }
      }

      navigate(targetUrl, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Invalid email or password';
      setBannerError(message);
      toast.error(message);
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleLoginSubmit();
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your subscriptions and billing"
      isLeaving={isLeaving}
      footerLink={null}
    >
      {/* Friendly Error Banner with shake animation and ARIA announcement */}
      {bannerError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 flex items-start gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-shake"
        >
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Authentication failed</span>
            <span>{bannerError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} noValidate className="space-y-3.5">
        {/* Email Input */}
        <Input
          ref={emailInputRef}
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          disabled={isLoading || isLeaving}
          required
          errorMessage={errors.email}
          leftIcon={<Mail className="w-4 h-4" />}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
        />

        {/* Password Input with show/hide and top-row Forgot Password link */}
        <PasswordInput
          label="Password"
          placeholder="••••••••••••"
          autoComplete="current-password"
          value={password}
          disabled={isLoading || isLeaving}
          required
          errorMessage={errors.password}
          labelRightSlot={
            <Link
              to="/forgot-password"
              className="font-medium text-brand-600 hover:text-brand-700 hover:underline transition-colors text-xs"
            >
              Forgot password?
            </Link>
          }
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          }}
        />

        {/* Full-width Sign in Button */}
        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={isLeaving}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign in
          </Button>
        </div>
      </form>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200/90" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-slate-50 px-3 text-slate-400 font-medium select-none">
            New to Brightloop?
          </span>
        </div>
      </div>

      {/* Full-width secondary (outline) button "Create an account" */}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        fullWidth
        disabled={isLoading || isLeaving}
        onClick={() => navigate('/signup')}
      >
        Create an account
      </Button>
    </AuthLayout>
  );
}
