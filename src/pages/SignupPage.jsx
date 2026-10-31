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

  // Autofocus the first field
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  // Check validity
  const isPwdValid = isPasswordValid(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isEmailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isNameFilled = name.trim().length > 0;

  // Submit button should only be enabled when all rules pass
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
      toast.success('Account created successfully! Please sign in.');
      // Redirect to login with pre-filled email
      navigate('/login', {
        state: { registeredEmail: email },
        replace: true,
      });
    } catch (err) {
      if (err.response?.status === 409 || err.message?.includes('already registered')) {
        // Handle inline on email field
        const message =
          err.response?.data?.message || 'An account with this email address already exists.';
        setErrors((prev) => ({ ...prev, email: message }));
        toast.error(message);
      } else {
        const fallbackMsg = err.response?.data?.message || 'Failed to create account. Please try again.';
        toast.error(fallbackMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start managing recurring subscriptions in minutes"
      footerLink={
        <p>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSignupSubmit} noValidate className="space-y-4">
        {/* Full Name */}
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

        {/* Email Address */}
        <Input
          label="Work email"
          type="email"
          autoComplete="email"
          placeholder="jane@company.com"
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

        {/* Password */}
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

          {/* Live PasswordChecklist */}
          <div className="mt-2.5">
            <PasswordChecklist password={password} />
          </div>
        </div>

        {/* Confirm Password */}
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

        {/* Submit Button */}
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
            Create account
          </Button>
          {!isFormValid && (
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Satisfy all password criteria and matching confirmation to enable submit
            </p>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}
