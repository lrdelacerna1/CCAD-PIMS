import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserIcon, PhoneIcon, MailIcon, BuildingOfficeIcon, CheckCircleIcon, ExclamationTriangleIcon, IdentificationIcon } from '../components/Icons';
import { getAreasApi } from '../../backend/api/areas';
import { Area } from '../types';

const ProfilePage: React.FC = () => {
  const { user, signOut, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    contactNumber: '',
    idNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [managedAreaNames, setManagedAreaNames] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setFormData({
        contactNumber: user.contactNumber || '',
        idNumber: user.idNumber || '',
      });

      if ((user.role === 'admin') && user.managedAreaIds?.length) {
          getAreasApi().then((allAreas: Area[]) => {
              const names = user.managedAreaIds
                  ?.map(id => allAreas.find(a => a.id === id)?.name)
                  .filter((name): name is string => !!name) || [];
              setManagedAreaNames(names);
          }).catch(console.error);
      }
    }
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto p-6 text-center dark:text-white">
        <p>Your account information could not be loaded. Please try refreshing the page.</p>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setFormData({
        contactNumber: user.contactNumber || '',
        idNumber: user.idNumber || '',
      });
    }
    setError('');
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (err: any) {
      setError('We could not save your changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{user.firstName} {user.lastName}</h1>
                <div className="flex items-center gap-3 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300 capitalize border border-sky-200 dark:border-sky-800">
                        {user.role}
                    </span>
                    {user.emailVerified ? (
                        <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircleIcon className="w-4 h-4 mr-1" /> Verified Account
                        </span>
                    ) : (
                        <span className="flex items-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                            <ExclamationTriangleIcon className="w-4 h-4 mr-1" /> Unverified
                        </span>
                    )}
                </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} className="!w-auto flex-1 md:flex-none">Edit Profile</Button>
                ) : (
                    <div className="flex gap-2 flex-1 md:flex-none">
                            <Button onClick={handleSave} isLoading={isLoading} className="!w-auto flex-1">Save</Button>
                            <Button onClick={handleCancel} variant="secondary" className="!w-auto flex-1">Cancel</Button>
                    </div>
                )}
                {!isEditing && <Button onClick={signOut} variant="danger" className="!w-auto flex-1 md:flex-none">Logout</Button>}
            </div>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-3 text-rose-700 dark:text-rose-300">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-700">
                        <UserIcon className="w-5 h-5 text-sky-500" /> Personal Information
                    </h3>
                    <div className="space-y-6">
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Full Name</p>
                                    <p className="text-slate-900 dark:text-white font-medium text-lg">{user.firstName} {user.lastName}</p>
                                </div>
                                {user.role !== 'guest' && (
                                <Input label="ID Number" id="idNumber" name="idNumber" value={formData.idNumber} onChange={handleInputChange} icon={<IdentificationIcon className="w-5 h-5"/>} />
                                )}
                                <Input label="Contact Number" id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} icon={<PhoneIcon className="w-5 h-5"/>} />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Full Name</p>
                                    <p className="text-slate-900 dark:text-white font-medium text-lg">{user.firstName} {user.lastName}</p>
                                </div>
                                {user.role !== 'guest' && (
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">ID Number</p>
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                                        <IdentificationIcon className="w-4 h-4 text-slate-400" />
                                        {user.idNumber || 'Not provided'}
                                    </div>
                                </div>
                                )}
                                <div className="md:col-span-2">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Email Address</p>
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                                        <MailIcon className="w-4 h-4 text-slate-400" />
                                        {user.emailAddress}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Contact Number</p>
                                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                                        <PhoneIcon className="w-4 h-4 text-slate-400" />
                                        {user.contactNumber || 'Not provided'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account Status</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-600">
                            <span className="text-sm text-slate-600 dark:text-slate-300">Verification</span>
                            <span className={`flex items-center text-sm font-medium ${user.emailVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {user.emailVerified ? (
                                    <><CheckCircleIcon className="w-4 h-4 mr-1"/> Verified</>
                                ) : (
                                    <><ExclamationTriangleIcon className="w-4 h-4 mr-1"/> Unverified</>
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-600">
                            <span className="text-sm text-slate-600 dark:text-slate-300">System Role</span>
                            <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">{user.role}</span>
                        </div>
                    </div>
                </div>

                {(user.role === 'admin') && managedAreaNames.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <BuildingOfficeIcon className="w-5 h-5 text-indigo-500" /> Managed Areas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {managedAreaNames.map((area, idx) => (
                            <span key={idx} className="px-3 py-1 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-full text-sm text-slate-700 dark:text-slate-300 shadow-sm">
                                {area}
                            </span>
                        ))}
                    </div>
                </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default ProfilePage;