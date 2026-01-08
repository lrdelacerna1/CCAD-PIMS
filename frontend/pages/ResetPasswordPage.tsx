import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { validateResetTokenApi, resetPasswordApi } from '../../backend/api/auth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LockIcon } from '../components/Icons';

const ResetPasswordPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [validity, setValidity] = useState<'validating' | 'valid' | 'invalid'>('validating');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const checkToken = async () => {
            if (!token) {
                setValidity('invalid');
                return;
            }
            try {
                await validateResetTokenApi(token);
                setValidity('valid');
            } catch (err) {
                setValidity('invalid');
            }
        };

        checkToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (!token) {
            setError('No reset token found.');
            return;
        }
        
        setIsLoading(true);
        setError('');
        setMessage('');

        try {
            await resetPasswordApi(token, password);
            setMessage('Your password has been reset successfully. Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password. The link may be expired.');
            setValidity('invalid');
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        if (validity === 'validating') {
            return <p className="text-center dark:text-white">Validating reset link...</p>;
        }
        
        if (validity === 'invalid') {
            return (
                <div className="text-center">
                    <h1 className="text-xl font-bold dark:text-white mb-4">Invalid or Expired Link</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        The password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <Link to="/forgot-password" target="_self" className="font-medium text-sky-600 hover:underline dark:text-sky-500 mt-4 block">
                        Request a new link
                    </Link>
                </div>
            );
        }
        
        if (message) {
            return (
                 <div className="text-center">
                    <h1 className="text-xl font-bold text-green-500 mb-4">Success!</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
                </div>
            );
        }

        return (
            <>
                <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
                    Set a New Password
                </h1>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                    <Input
                        label="New Password"
                        id="password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        icon={<LockIcon className="w-5 h-5" />}
                    />
                    <Input
                        label="Confirm New Password"
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        icon={<LockIcon className="w-5 h-5" />}
                    />
                    <Button type="submit" isLoading={isLoading}>
                        Reset Password
                    </Button>
                </form>
            </>
        );
    };

    return (
        <AuthLayout>
            <Card>
                {renderContent()}
            </Card>
        </AuthLayout>
    );
};

export default ResetPasswordPage;
