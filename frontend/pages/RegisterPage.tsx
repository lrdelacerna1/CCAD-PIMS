import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AuthLayout } from '../components/layout/AuthLayout';
import { MailIcon, LockIcon, UserIcon, GoogleIcon, PhoneIcon } from '../components/Icons';
import GoogleLoginMockModal from '../components/auth/GoogleLoginMockModal';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const validatePassword = (pwd: string) => {
    const hasLength = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    
    return hasLength && hasUpper && hasLower && hasNumber && hasSpecial;
  };

  const validateEmail = (email: string) => {
    // Basic email regex pattern
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const handleContactNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (/^\d*$/.test(value)) {
      setContactNumber(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
        setError('Please enter a valid email address.');
        return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password is too weak. Please include uppercase, lowercase, numbers, and special characters.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      await register({ email, pass: password, firstName, lastName, contactNumber });
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
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
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create account with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full sm:max-w-xl">
        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white font-heading text-center mb-6">
          Create an account
        </h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="First Name" id="firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required icon={<UserIcon className="w-5 h-5"/>} />
            <Input label="Last Name" id="lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)} required icon={<UserIcon className="w-5 h-5"/>} />
          </div>

          <Input 
            label="Contact Number (Optional)" 
            id="contactNumber" 
            type="tel" 
            value={contactNumber} 
            onChange={handleContactNumberChange} 
            icon={<PhoneIcon className="w-5 h-5"/>} 
          />
          <Input label="Your email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required icon={<MailIcon className="w-5 h-5"/>} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required icon={<LockIcon className="w-5 h-5"/>} />
            <Input label="Confirm password" id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required icon={<LockIcon className="w-5 h-5"/>} />
          </div>
          
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          
          <div className="pt-2">
            <Button type="submit" isLoading={isLoading}>Create account</Button>
          </div>

          <div className="relative flex items-center py-2">
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
            Create account with Google
          </button>
          <p className="text-sm font-light text-slate-500 dark:text-slate-400 text-center">
            Already have an account? <Link to="/login" target="_self" className="font-medium text-up-maroon-700 hover:underline dark:text-up-maroon-400">Login here</Link>
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

export default RegisterPage;