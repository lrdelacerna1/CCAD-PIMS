import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AuthLayout } from '../components/layout/AuthLayout';
import { MailIcon } from '../components/Icons';
import { requestPasswordResetApi } from '../../backend/api/auth';


const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            await requestPasswordResetApi(email);
            setMessage(`If an account with email ${email} exists, a password reset link has been sent.`);
        } catch (err: any) {
            // For security, show the same message even if the API fails or email doesn't exist.
            setMessage(`If an account with email ${email} exists, a password reset link has been sent.`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Card>
                <h1 className="text-xl font-bold dark:text-white">Forgot your password?</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Enter your email and we will send you a link to reset your password. (A link will be logged to the console).
                </p>
                {message ? (
                    <p className="text-sm text-green-500">{message}</p>
                ) : (
                    <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                        <Input label="Your email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required icon={<MailIcon className="w-5 h-5" />} />
                        <Button type="submit" isLoading={isLoading}>Send reset link</Button>
                    </form>
                )}
                 <p className="text-sm font-light text-slate-500 dark:text-slate-400 mt-4">
                    Remembered your password? <Link to="/login" target="_self" className="font-medium text-up-maroon-700 hover:underline dark:text-up-maroon-500">Login here</Link>
                </p>
            </Card>
        </AuthLayout>
    );
};

export default ForgotPasswordPage;