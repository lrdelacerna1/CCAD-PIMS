import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/Card';
import { getAreasApi } from '../backend/api/areas';
// FIX: Corrected import path for Area type
import { Area } from '../frontend/types';

const AdminDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [managedAreaNames, setManagedAreaNames] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAreaNames = async () => {
            setIsLoading(true);
            if (!user || !user.managedAreaIds || user.managedAreaIds.length === 0) {
                setManagedAreaNames([]);
                setIsLoading(false);
                return;
            }

            try {
                const allAreas: Area[] = await getAreasApi();
                const userAreaNames = user.managedAreaIds
                    .map(id => allAreas.find(area => area.id === id)?.name)
                    .filter((name): name is string => !!name); 
                setManagedAreaNames(userAreaNames);
            } catch (error) {
                console.error("Failed to fetch area names", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAreaNames();
    }, [user]);

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold dark:text-white mb-6">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="!p-0">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold dark:text-white">Welcome</h2>
                        <p className="text-lg dark:text-gray-300 mt-2">
                            Hello, Admin <span className="font-semibold">{user?.email}</span>!
                        </p>
                        <p className="dark:text-gray-400 mt-2">
                            This is a protected area for administrators only.
                        </p>
                    </div>
                </Card>

                <Card className="!p-0">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold dark:text-white mb-4">Your Managed Areas</h2>
                        {isLoading ? (
                            <p className="text-gray-500 dark:text-gray-400">Loading your areas...</p>
                        ) : (
                             <div className="space-y-2">
                                {managedAreaNames.length > 0 ? (
                                    <ul className="list-disc list-inside text-gray-800 dark:text-gray-200">
                                        {managedAreaNames.map((area, index) => (
                                            <li key={index}>{area}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400">You are not currently managing any areas.</p>
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
