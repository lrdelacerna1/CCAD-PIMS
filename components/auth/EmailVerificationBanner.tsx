import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const EmailVerificationBanner: React.FC = () => {
    const { user, verifyEmail } = useAuth();
    const [isVerifying, setIsVerifying] = useState(false);
    const [message, setMessage] = useState('');

    if (!user || user.isVerified) return null;

    const handleVerify = async () => {
        setIsVerifying(true);
        setMessage('');
        try {
            await verifyEmail();
            setMessage("Email verified successfully!");
        } catch (error) {
            setMessage("Verification failed. Please try again.");
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
            <p className="font-bold">Verify Your Email</p>
            <p>Your email address is not verified. Please check your inbox for a verification link.</p>
            <button onClick={handleVerify} disabled={isVerifying} className="mt-2 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50">
                {isVerifying ? "Verifying..." : "Resend Verification (Click to mock)"}
            </button>
             {message && <p className="mt-2 text-sm">{message}</p>}
        </div>
    );
};
