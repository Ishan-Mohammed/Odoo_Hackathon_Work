import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail, ArrowRight } from 'lucide-react';
import AuthLayout from '../components/layout/AuthLayout';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Button from '../components/ui/Button';
import PasswordChecklist, { isPasswordValid } from '../components/ui/PasswordChecklist';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const nameInputRef = useRef(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const isPwdValid = isPasswordValid(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isEmailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isNameFilled = name.trim().length > 0;

  const isFormValid = isPwdValid && passwordsMatch && isEmailFormatValid && isNameFilled;

  const handleSignupSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!isEmailFormatValid) {
      newErrors.email = 'Please provide a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!isPwdValid) {
      newErrors.password = 'Password does not satisfy all security requirements';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await signup({ name, email, password });
      toast.success('Account created successfully!');
      navigate('/portal', { replace: true });
    } catch (err) {
      if (
        err.response?.status === 409 ||
        err.code === 'DUPLICATE_EMAIL' ||
        err.response?.data?.code === 'DUPLICATE_EMAIL' ||
        err.message?.toLowerCase().includes('already')
      ) {
        const message =
          err.response?.data?.message || err.response?.data?.error || err.message || 'An account with this email address already exists.';
        setErrors((prev) => ({ ...prev, email: message }));
        toast.error(message);
      } else if (err.code === 'NETWORK_ERROR' || !err.response || err.status === 0) {
        const netMsg = "Can't reach the server. Please try again.";
        setErrors((prev) => ({ ...prev, form: netMsg }));
        toast.error(netMsg);
      } else {
        const fallbackMsg =
          err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create account. Please try again.';
        toast.error(fallbackMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start managing subscriptions in minutes"
      footerLink={
        <p>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:text-brand-700 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSignupSubmit} noValidate className="space-y-3.5">
        <Input
          ref={nameInputRef}
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          value={name}
          disabled={isLoading}
          required
          errorMessage={errors.name}
          leftIcon={<User className="w-4 h-4" />}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
        />

        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
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

        <div>
          <PasswordInput
            label="Password"
            placeholder="Create a strong password"
            autoComplete="new-password"
            value={password}
            disabled={isLoading}
            required
            errorMessage={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              if (errors.confirmPassword && e.target.value === confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }
            }}
          />

          <div className="mt-2">
            <PasswordChecklist password={password} />
          </div>
        </div>

        <div>
          <PasswordInput
            label="Confirm password"
            placeholder="Repeat your password"
            autoComplete="new-password"
            value={confirmPassword}
            disabled={isLoading}
            required
            errorMessage={
              errors.confirmPassword ||
              (confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined)
            }
            success={confirmPassword.length > 0 && password === confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }
            }}
          />
        </div>

        <div className="pt-1.5">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={!isFormValid || isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Create account
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
