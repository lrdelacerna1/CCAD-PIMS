import React from 'react';
import { useAuth } from '../hooks/useAuth';

const HomePage: React.FC = () => {
    const { user } = useAuth();
    return (
        <div className="container mx-auto p-6 text-center">
            <h1 className="text-4xl font-bold dark:text-white mb-4">Welcome to CCAD PIMS</h1>
            {user ? (
                 <p className="text-lg dark:text-gray-300">You are logged in as {user.email}.</p>
            ) : (
                <p className="text-lg dark:text-gray-300">Please log in or sign up to continue.</p>
            )}
        </div>
    );
};

export default HomePage;
