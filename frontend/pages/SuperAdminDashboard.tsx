import React, { useEffect, useState } from 'react';
import { appealService, Appeal } from '../services/appealService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const SuperAdminDashboard: React.FC = () => {
    const [appeals, setAppeals] = useState<Appeal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [processingStatus, setProcessingStatus] = useState<{ [key: string]: 'approved' | 'rejected' | undefined }>({});

    const fetchAppeals = async () => {
        setIsLoading(true);
        setError('');
        try {
            const fetchedAppeals = await appealService.getAllAppeals();
            setAppeals(fetchedAppeals.filter(a => a.status === 'pending'));
        } catch (err: any) {
            console.error('Failed to fetch appeals:', err);
            setError(err.message || 'Failed to fetch appeals.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppeals();
    }, []);

    const handleAppeal = async (appealId: string, userId: string, status: 'approved' | 'rejected') => {
        if (!userId) {
            setError('Cannot process appeal: User ID is missing.');
            return;
        }
        if (processingStatus[appealId]) {
            return;
        }
        
        setProcessingStatus(prev => ({ ...prev, [appealId]: status }));
        setError('');
        
        try {
            await appealService.updateAppealStatus(appealId, userId, status);
            setAppeals(appeals.filter(appeal => appeal.id !== appealId));
        } catch (err: any) {
            console.error('Failed to update appeal:', err);
            setError(err.message || 'Failed to update appeal. Please try again.');
        } finally {
            setProcessingStatus(prev => ({ ...prev, [appealId]: undefined }));
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 dark:text-white">
                Pending Appeals ({appeals.length})
            </h1>

            {error && (
                <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
                    {error}
                </div>
            )}
            <Card className="!max-w-none">
                <div className="p-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ccad-red"></div>
                            <p className="ml-3 dark:text-slate-300">Loading appeals...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {appeals.length > 0 ? (
                                appeals.map(appeal => (
                                    <div key={appeal.id} className="p-4 border dark:border-slate-700 rounded-lg flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-800">
                                        <div className="flex-1">
                                            <p className="font-semibold dark:text-white">{appeal.firstName} {appeal.lastName}</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{appeal.email}</p>
                                            {!appeal.userId && (<p className="text-xs text-red-500 mt-2">Warning: User ID is missing</p>)}
                                        </div>
                                        <div className="flex-shrink-0 flex gap-2 mt-4 sm:mt-0">
                                            <Button 
                                                onClick={() => handleAppeal(appeal.id, appeal.userId, 'approved')} 
                                                size="xs" 
                                                disabled={!!processingStatus[appeal.id]} 
                                                isLoading={processingStatus[appeal.id] === 'approved'}
                                            >
                                                Approve
                                            </Button>
                                            <Button 
                                                onClick={() => handleAppeal(appeal.id, appeal.userId, 'rejected')} 
                                                variant="destructive" 
                                                size="xs" 
                                                disabled={!!processingStatus[appeal.id]} 
                                                isLoading={processingStatus[appeal.id] === 'rejected'}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="dark:text-slate-400">No pending faculty appeals.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default SuperAdminDashboard;
