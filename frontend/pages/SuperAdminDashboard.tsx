import React, { useEffect, useState, useMemo } from 'react';
import { appealService, Appeal } from '../services/appealService';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type HistoryTab = 'pending' | 'approved' | 'rejected';

const StatusBadge: React.FC<{ status: Appeal['status'] }> = ({ status }) => {
    const styles: Record<Appeal['status'], string> = {
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
        approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${styles[status]}`}>
            {status}
        </span>
    );
};

const SuperAdminDashboard: React.FC = () => {
    const [allAppeals, setAllAppeals] = useState<Appeal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [processingStatus, setProcessingStatus] = useState<{ [key: string]: 'approved' | 'rejected' | undefined }>({});
    const [activeTab, setActiveTab] = useState<HistoryTab>('pending');

    const fetchAppeals = async () => {
        setIsLoading(true);
        setError('');
        try {
            const fetchedAppeals = await appealService.getAllAppeals();
            setAllAppeals(fetchedAppeals);
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
        if (processingStatus[appealId]) return;

        setProcessingStatus(prev => ({ ...prev, [appealId]: status }));
        setError('');

        try {
            await appealService.updateAppealStatus(appealId, userId, status);
            // Optimistically update local state
            setAllAppeals(prev =>
                prev.map(a => a.id === appealId ? { ...a, status } : a)
            );
            // Switch to the corresponding history tab after action
            setActiveTab(status);
        } catch (err: any) {
            console.error('Failed to update appeal:', err);
            setError(err.message || 'Failed to update appeal. Please try again.');
        } finally {
            setProcessingStatus(prev => ({ ...prev, [appealId]: undefined }));
        }
    };

    const pendingAppeals = useMemo(() => allAppeals.filter(a => a.status === 'pending'), [allAppeals]);
    const approvedAppeals = useMemo(() => allAppeals.filter(a => a.status === 'approved'), [allAppeals]);
    const rejectedAppeals = useMemo(() => allAppeals.filter(a => a.status === 'rejected'), [allAppeals]);

    const activeAppeals = activeTab === 'pending' ? pendingAppeals : activeTab === 'approved' ? approvedAppeals : rejectedAppeals;

    const tabClasses = (tab: HistoryTab) =>
        `px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            activeTab === tab
                ? 'bg-up-maroon-50 text-up-maroon-800 border border-up-maroon-200 dark:bg-up-maroon-900/30 dark:text-up-maroon-300 dark:border-up-maroon-800'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        }`;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 dark:text-white font-heading">
                Faculty Appeals
            </h1>

            {error && (
                <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="flex space-x-2 mb-4 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-lg w-fit">
                <button onClick={() => setActiveTab('pending')} className={tabClasses('pending')}>
                    Pending
                    {pendingAppeals.length > 0 && (
                        <span className="ml-2 bg-up-maroon-700 text-white text-xs rounded-full px-1.5 py-0.5">
                            {pendingAppeals.length}
                        </span>
                    )}
                </button>
                <button onClick={() => setActiveTab('approved')} className={tabClasses('approved')}>
                    Approved
                    {approvedAppeals.length > 0 && (
                        <span className="ml-2 bg-slate-400 text-white text-xs rounded-full px-1.5 py-0.5">
                            {approvedAppeals.length}
                        </span>
                    )}
                </button>
                <button onClick={() => setActiveTab('rejected')} className={tabClasses('rejected')}>
                    Rejected
                    {rejectedAppeals.length > 0 && (
                        <span className="ml-2 bg-slate-400 text-white text-xs rounded-full px-1.5 py-0.5">
                            {rejectedAppeals.length}
                        </span>
                    )}
                </button>
            </div>

            <Card className="!max-w-none">
                <div className="p-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-up-maroon-700"></div>
                            <p className="ml-3 dark:text-slate-300">Loading appeals...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {activeAppeals.length > 0 ? (
                                activeAppeals.map(appeal => (
                                    <div
                                        key={appeal.id}
                                        className="p-4 border dark:border-slate-700 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800 gap-4"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold dark:text-white">
                                                    {appeal.firstName} {appeal.lastName}
                                                </p>
                                                <StatusBadge status={appeal.status} />
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                                                {appeal.email}
                                            </p>
                                            {!appeal.userId && (
                                                <p className="text-xs text-red-500 mt-1">Warning: User ID is missing</p>
                                            )}
                                        </div>

                                        {/* Only show action buttons for pending appeals */}
                                        {appeal.status === 'pending' && (
                                            <div className="flex-shrink-0 flex gap-2">
                                                <Button
                                                    onClick={() => handleAppeal(appeal.id, appeal.userId, 'approved')}
                                                    size="xs"
                                                    variant="success"
                                                    disabled={!!processingStatus[appeal.id]}
                                                    isLoading={processingStatus[appeal.id] === 'approved'}
                                                    className="!w-auto"
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    onClick={() => handleAppeal(appeal.id, appeal.userId, 'rejected')}
                                                    variant="danger"
                                                    size="xs"
                                                    disabled={!!processingStatus[appeal.id]}
                                                    isLoading={processingStatus[appeal.id] === 'rejected'}
                                                    className="!w-auto"
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="dark:text-slate-400">
                                        No {activeTab} faculty appeals.
                                    </p>
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