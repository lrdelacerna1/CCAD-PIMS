import React, { useState, useEffect, useMemo } from 'react';
import { Penalty, User } from '../../types';
import { getAllPenaltiesApi, markPenaltyAsPaidApi } from '../../../backend/api/penalties';
import { getAllUsersApi } from '../../../backend/api/auth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SearchIcon, CheckCircleIcon, ExclamationTriangleIcon, UserIcon, AcademicCapIcon, BriefcaseIcon } from '../Icons';
import { format } from 'date-fns';

const AccountabilityList: React.FC = () => {
    const [penalties, setPenalties] = useState<Penalty[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'outstanding' | 'resolved'>('all');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [penaltiesData, usersData] = await Promise.all([
                getAllPenaltiesApi(),
                getAllUsersApi()
            ]);
            setPenalties(penaltiesData);
            setUsers(usersData);
        } catch (err) {
            setError('Failed to load accountability data.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleMarkAsPaid = async (penaltyId: string) => {
        setProcessingId(penaltyId);
        try {
            await markPenaltyAsPaidApi(penaltyId);
            // Optimistic update
            setPenalties(prev => prev.map(p => p.id === penaltyId ? { ...p, isPaid: true } : p));
        } catch (err) {
            console.error("Failed to update status");
        } finally {
            setProcessingId(null);
        }
    };

    const getUserName = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
    };

    const getUserEmail = (userId: string) => {
        const user = users.find(u => u.id === userId);
        return user ? user.email : '';
    };
    
    const renderUser = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) {
            return (
                <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-slate-400 flex-shrink-0" title="User" />
                    <span className="font-medium text-slate-900 whitespace-nowrap dark:text-white">Unknown User</span>
                </div>
            );
        }
    
        let icon: React.ReactNode;
    
        switch (user.role) {
            case 'user':
                icon = <AcademicCapIcon className="w-5 h-5 text-slate-500 flex-shrink-0" title="Student/User" />;
                break;
            case 'admin':
            case 'superadmin':
                icon = <BriefcaseIcon className="w-5 h-5 text-slate-500 flex-shrink-0" title="Admin/Staff" />;
                break;
            default:
                icon = <UserIcon className="w-5 h-5 text-slate-400 flex-shrink-0" title="User" />;
                break;
        }
    
        return (
            <div className="flex items-center gap-2">
                {icon}
                <span className="font-medium text-slate-900 whitespace-nowrap dark:text-white">{user.firstName} {user.lastName}</span>
            </div>
        );
    };

    const filteredPenalties = useMemo(() => {
        let filtered = penalties;
        
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(p => {
                const userName = getUserName(p.userId).toLowerCase();
                const userEmail = getUserEmail(p.userId).toLowerCase();
                return userName.includes(lowerQuery) || userEmail.includes(lowerQuery);
            });
        }
        
        return filtered;
    }, [penalties, users, searchQuery]);

    const { unpaid, paid } = useMemo(() => {
        const unpaid = filteredPenalties.filter(p => !p.isPaid);
        const paid = filteredPenalties.filter(p => p.isPaid);
        return { unpaid, paid };
    }, [filteredPenalties]);

    const renderTable = (data: Penalty[], title: string, isHistory: boolean) => (
        <div className="mb-8">
            <h3 className={`text-lg font-semibold mb-4 flex items-center ${isHistory ? 'text-slate-600 dark:text-slate-300' : 'text-rose-600 dark:text-rose-400'}`}>
                {isHistory ? <CheckCircleIcon className="w-5 h-5 mr-2" /> : <ExclamationTriangleIcon className="w-5 h-5 mr-2" />}
                {title} ({data.length})
            </h3>
            {data.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500">
                    No records found.
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-x-auto border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Student</th>
                                <th scope="col" className="px-6 py-3">Date Issued</th>
                                <th scope="col" className="px-6 py-3">Reason</th>
                                <th scope="col" className="px-6 py-3">Amount</th>
                                <th scope="col" className="px-6 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((penalty) => (
                                <tr key={penalty.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <td className="px-6 py-4">
                                        {renderUser(penalty.userId)}
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {getUserEmail(penalty.userId)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {format(new Date(penalty.createdAt), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 max-w-xs truncate" title={penalty.reason}>
                                        {penalty.reason}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                        ₱{penalty.amount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {!penalty.isPaid ? (
                                            <Button 
                                                onClick={() => handleMarkAsPaid(penalty.id)} 
                                                isLoading={processingId === penalty.id}
                                                className="!py-1 !px-3 text-xs !w-auto"
                                                variant="success"
                                            >
                                                Mark as Paid
                                            </Button>
                                        ) : (
                                            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                                Paid
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return (
        <div>
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-grow max-w-md">
                    <Input 
                        label="Search Student" 
                        id="search-student" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder="Search by name or email..."
                        icon={<SearchIcon className="w-5 h-5"/>}
                    />
                </div>
                <div className="w-full sm:w-48">
                    <Select
                        label="Filter Status"
                        id="status-filter"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        options={[
                            { value: 'all', label: 'All' },
                            { value: 'outstanding', label: 'Outstanding' },
                            { value: 'resolved', label: 'Resolved' },
                        ]}
                    />
                </div>
            </div>

            {error && <p className="text-red-500 mb-4">{error}</p>}
            {isLoading ? (
                <p className="text-center dark:text-white">Loading accountability records...</p>
            ) : (
                <>
                    {(filterStatus === 'all' || filterStatus === 'outstanding') && 
                        renderTable(unpaid, "Outstanding Accountabilities (Unpaid)", false)}
                    {(filterStatus === 'all' || filterStatus === 'resolved') && 
                        renderTable(paid, "Resolved Accountabilities (Paid)", true)}
                </>
            )}
        </div>
    );
};

export default AccountabilityList;