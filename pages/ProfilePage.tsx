import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return <div className="container mx-auto p-6 text-center dark:text-white">No user data found.</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">User Profile</h1>
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-gray-600 dark:text-gray-400">Name:</p>
            <p className="text-gray-800 dark:text-gray-200">{user.firstName} {user.lastName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-600 dark:text-gray-400">Email:</p>
            <p className="text-gray-800 dark:text-gray-200">{user.email}</p>
          </div>
           <div>
            <p className="font-semibold text-gray-600 dark:text-gray-400">Contact Number:</p>
            <p className="text-gray-800 dark:text-gray-200">{user.contactNumber}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-600 dark:text-gray-400">Verification Status:</p>
            <p className={`font-medium ${user.isVerified ? 'text-green-500' : 'text-yellow-500'}`}>
              {user.isVerified ? 'Verified' : 'Not Verified'}
            </p>
          </div>
           <div>
            <p className="font-semibold text-gray-600 dark:text-gray-400">Role:</p>
            <p className="text-gray-800 dark:text-gray-200 capitalize">{user.role}</p>
          </div>
        </div>
        <Button onClick={logout} className="mt-6">
          Logout
        </Button>
      </div>
    </div>
  );
};

export default ProfilePage;
