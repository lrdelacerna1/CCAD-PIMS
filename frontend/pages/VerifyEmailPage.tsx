import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const VerifyEmailPage: React.FC = () => {
    const { user, sendVerificationEmail, reloadUser } = useAuth();
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleCheckVerification = useCallback(async () => {
        setError('');
        try {
            await reloadUser();
        } catch (err: any) {
            setError(err.message || 'Failed to check verification status.');
        }
    }, [reloadUser]);

    useEffect(() => {
        if (user?.emailVerified) {
            navigate('/'); // Redirect immediately, no delay
        }
    }, [user, navigate]);

    useEffect(() => {
        if (user?.emailVerified) return;

        const intervalId = setInterval(() => {
            handleCheckVerification();
        }, 5000); // Check every 5 seconds

        return () => clearInterval(intervalId);
    }, [handleCheckVerification, user]);


    if (!user) {
        return <Navigate to="/login" />;
    }

    if (user.emailVerified) {
        return (
            <div className="container mx-auto p-6 max-w-md mt-20">
                <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-8 text-center">
                    <h1 className="text-2xl font-bold mb-4 dark:text-white">Your email has been verified</h1>
                    <p className="text-slate-600 dark:text-slate-300">
                        Redirecting you now...
                    </p>
                </div>
            </div>
        );
    }

    const handleResend = async () => {
        setIsSending(true);
        setMessage('');
        setError('');
        try {
            await sendVerificationEmail();
            setMessage('A new verification email has been sent to your inbox.');
        } catch (err: any) {
            setError(err.message || 'Failed to send verification email.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-md text-center mt-20">
            <h1 className="text-2xl font-bold mb-4 dark:text-white">Verify Your Email</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
                Thank you for registering! Your account is not fully active until your email address is verified. 
                Please check your inbox for a verification link we just sent to <strong>{user?.email}</strong>.
            </p>
            
            {message && <p className="text-green-600 mb-4">{message}</p>}
            {error && <p className="text-red-600 mb-4">{error}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                    onClick={handleResend} 
                    disabled={isSending}
                    className="w-full"
                >
                    {isSending ? 'Sending...' : 'Resend Verification Email'}
                </Button>
                <Link to="/login" className="w-full">
                    <Button variant="dark" className="w-full">
                        Return to Login
                    </Button>
                </Link>
            </div>
            <p className="text-sm text-slate-500 mt-6">
                We are automatically checking for your email verification. This page will update once you are verified.
            </p>
        </div>
    );
};

export default VerifyEmailPage;
