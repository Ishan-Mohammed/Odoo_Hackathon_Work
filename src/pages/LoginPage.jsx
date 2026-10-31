import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, AlertCircle, ArrowRight } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import DemoCredentialChips from '../components/ui/DemoCredentialChips';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const emailInputRef = useRef(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [bannerError, setBannerError] = useState('');

  // Handle pre-filled email from signup redirect or query params
  useEffect(() => {
    if (location.state?.registeredEmail) {
      setEmail(location.state.registeredEmail);
    }
  }, [location.state]);

  // Autofocus the email field on initial mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const validate = () => {
    const newErrors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = async (customCreds = null) => {
    const loginEmail = customCreds ? customCreds.email : email;
    const loginPass = customCreds ? customCreds.password : password;

    if (!customCreds && !validate()) return;

    setIsLoading(true);
    setBannerError('');

    try {
      const data = await login({ email: loginEmail, password: loginPass });
      toast.success(`Welcome back, ${data.user?.name || 'User'}!`);

      // Determine redirection target
      const returnUrl = location.state?.from?.pathname;
      if (returnUrl) {
        navigate(returnUrl, { replace: true });
      } else if (data.user?.role === 'customer') {
        navigate('/portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const message =
        err.response?.data?.message || 'Invalid email or password. Please check your credentials.';
      setBannerError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleLoginSubmit();
  };

  // Demo account one-click chip handler
  const handleSelectDemo = (creds) => {
    setEmail(creds.email);
    setPassword(creds.password);
    setErrors({});
    setBannerError('');
    handleLoginSubmit(creds);
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your subscriptions and billing"
      footerLink={
        <p>
          New to Brightloop?{' '}
          <Link
            to="/signup"
            className="font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
          >
            Create an account
          </Link>
        </p>
      }
    >
      {/* Friendly Error Banner */}
      {bannerError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Authentication failed</span>
            <span>{bannerError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} noValidate className="space-y-4">
        {/* Email Input */}
        <Input
          ref={emailInputRef}
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          disabled={isLoading}
          required
          errorMessage={errors.email}
          leftIcon={<Mail className="w-4 h-4" />}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
        />

        {/* Password Input */}
        <div>
          <PasswordInput
            label="Password"
            placeholder="••••••••••••"
            autoComplete="current-password"
            value={password}
            disabled={isLoading}
            required
            errorMessage={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
          />
          <div className="flex justify-end mt-1.5">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign in
          </Button>
        </div>
      </form>

      {/* Demo Credential Chips */}
      <DemoCredentialChips onSelect={handleSelectDemo} disabled={isLoading} />
    </AuthLayout>
  );
}
