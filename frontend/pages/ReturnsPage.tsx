import React from 'react';
import AccountabilityList from '../components/admin/AccountabilityList';

const ReturnsPage: React.FC = () => {
    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold dark:text-white mb-6">Returns & Penalties</h1>
            <AccountabilityList />
        </div>
    );
};

export default ReturnsPage;