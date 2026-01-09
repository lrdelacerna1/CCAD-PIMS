
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AuthLayout } from '../components/layout/AuthLayout';
import { MailIcon, LockIcon, UserIcon, GoogleIcon, PhoneIcon, AcademicCapIcon, BriefcaseIcon } from '../components/Icons';
import { UserRole } from '../types';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, signInWithGoogle } = useAuth();

  const [userType, setUserType] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [studentId, setStudentId] = useState('');
  const [program, setProgram] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
        let userData: any = {
            emailAddress: email,
            password: password,
            firstName,
            lastName,
            contactNumber,
            role: userType,
        };

        if (userType === 'student') {
            userData = { ...userData, studentId, program };
        }

        await register(userData);
        navigate('/verify-email');
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/verify-email');
    } catch (err: any) {
      setError(err.message || 'Failed to create account with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full sm:max-w-xl">
        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white font-heading text-center mb-4">
          Create a New Account
        </h1>

        {/* User Type Selection */}
        <div className="flex justify-center gap-4 mb-6">
            <button onClick={() => setUserType('student')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${userType === 'student' ? 'bg-ccad-red text-white' : 'bg-slate-200 dark:bg-slate-700'}`}><AcademicCapIcon className="w-5 h-5"/> Student</button>
            <button onClick={() => setUserType('guest')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${userType === 'guest' ? 'bg-ccad-red text-white' : 'bg-slate-200 dark:bg-slate-700'}`}><UserIcon className="w-5 h-5"/> Guest</button>
            <button onClick={() => setUserType('faculty')} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${userType === 'faculty' ? 'bg-ccad-red text-white' : 'bg-slate-200 dark:bg-slate-700'}`}><BriefcaseIcon className="w-5 h-5"/> Faculty</button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="First Name" id="firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required icon={<UserIcon className="w-5 h-5"/>} />
            <Input label="Last Name" id="lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)} required icon={<UserIcon className="w-5 h-5"/>} />
          </div>

          <Input label={userType === 'guest' ? 'Email Address' : 'UP Mail Address'} id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required icon={<MailIcon className="w-5 h-5"/>} />

          {/* Student-specific fields */}
          {userType === 'student' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Student ID" id="studentId" type="text" value={studentId} onChange={e => setStudentId(e.target.value)} required icon={<UserIcon className="w-5 h-5"/>} />
              <Input label="Program" id="program" type="text" value={program} onChange={e => setProgram(e.target.value)} required icon={<AcademicCapIcon className="w-5 h-5"/>} />
            </div>
          )}

          <Input label="Contact Number" id="contactNumber" type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)} icon={<PhoneIcon className="w-5 h-5"/>} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required icon={<LockIcon className="w-5 h-5"/>} />
            <Input label="Confirm password" id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required icon={<LockIcon className="w-5 h-5"/>} />
          </div>
          
          {error && <p className="text-sm text-red-500 mt-2 text-center">{error}</p>}
          
          <div className="pt-2">
            <Button type="submit" isLoading={isLoading} className="w-full">Create account</Button>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
            <span className="flex-shrink mx-4 text-sm text-slate-500 dark:text-slate-400">or</span>
            <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
          </div>
          
          <Button variant="secondary" type="button" disabled={isGoogleLoading} onClick={handleGoogleSignUp} className="w-full">
             {isGoogleLoading ? (
               <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <GoogleIcon className="w-4 h-4 mr-2" />
            )}
            Sign up with Google
          </Button>

          <p className="text-sm font-light text-slate-500 dark:text-slate-400 text-center">
            Already have an account? <Link to="/login" target="_self" className="font-medium text-ccad-red hover:underline dark:text-ccad-red-light">Login here</Link>
          </p>
        </form>
      </Card>
    </AuthLayout>
  );
};

export default RegisterPage;
