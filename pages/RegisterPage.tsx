import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AuthLayout } from '../components/layout/AuthLayout';
import { MailIcon, LockIcon, UserIcon, PhoneIcon } from '../components/Icons';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
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

  return (
    <AuthLayout>
      <Card>
        <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
          Create an account
        </h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
          <Input label="First Name" id="firstName" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required icon={<UserIcon className="w-5 h-5"/>} />
          <Input label="Last Name" id="lastName" type="text" value={lastName} onChange={e => setLastName(e.target.value)} required icon={<UserIcon className="w-5 h-5"/>} />
          <Input label="Contact Number" id="contactNumber" type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)} required icon={<PhoneIcon className="w-5 h-5"/>} />
          <Input label="Your email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required icon={<MailIcon className="w-5 h-5"/>} />
          <Input label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required icon={<LockIcon className="w-5 h-5"/>} />
          <Input label="Confirm password" id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required icon={<LockIcon className="w-5 h-5"/>} />
          <Button type="submit" isLoading={isLoading}>Create account</Button>
          <p className="text-sm font-light text-gray-500 dark:text-gray-400">
            Already have an account? <Link to="/login" target="_self" className="font-medium text-indigo-600 hover:underline dark:text-indigo-500">Login here</Link>
          </p>
        </form>
      </Card>
    </AuthLayout>
  );
};

export default RegisterPage;
