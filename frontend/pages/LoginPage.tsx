import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AuthLayout } from '../components/layout/AuthLayout';
import { MailIcon, LockIcon, GoogleIcon } from '../components/Icons';
import GoogleLoginMockModal from '../components/auth/GoogleLoginMockModal';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenGoogleModal = () => {
    setIsGoogleModalOpen(true);
  };

  const handleSelectGoogleAccount = async (selectedEmail: string) => {
    setIsGoogleModalOpen(false);
    setError('');
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle(selectedEmail);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card>
        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white font-heading">
          Sign in to your account
        </h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
          <Input label="Your email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required icon={<MailIcon className="w-5 h-5"/>} />
          <Input label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required icon={<LockIcon className="w-5 h-5"/>} />
          <div className="flex items-center justify-between">
            <Link to="/forgot-password" target="_self" className="text-sm font-medium text-up-maroon-700 hover:underline dark:text-up-maroon-400">Forgot password?</Link>
          </div>
          <Button type="submit" isLoading={isLoading}>Sign in</Button>
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
            <span className="flex-shrink mx-4 text-sm text-slate-500 dark:text-slate-400">or</span>
            <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
          </div>
          <button
            type="button"
            disabled={isGoogleLoading}
            onClick={handleOpenGoogleModal}
            className="w-full flex items-center justify-center py-2.5 px-4 text-sm font-medium text-slate-900 focus:outline-none bg-white rounded-lg border border-slate-200 hover:bg-slate-100 hover:text-up-maroon-800 focus:z-10 focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-600 dark:hover:text-white dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {isGoogleLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <GoogleIcon className="w-4 h-4 mr-2" />
            )}
            Sign in with Google
          </button>
          <p className="text-sm font-light text-slate-500 dark:text-slate-400">
            Don’t have an account yet? <Link to="/register" target="_self" className="font-medium text-up-maroon-700 hover:underline dark:text-up-maroon-400">Sign up</Link>
          </p>
        </form>
      </Card>
      
      <GoogleLoginMockModal 
        isOpen={isGoogleModalOpen} 
        onClose={() => setIsGoogleModalOpen(false)} 
        onSelectAccount={handleSelectGoogleAccount} 
      />
    </AuthLayout>
  );
};

export default LoginPage;