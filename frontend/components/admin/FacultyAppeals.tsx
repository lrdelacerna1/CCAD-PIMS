import React, { useEffect, useState } from 'react';
import { appealService, Appeal } from '../../services/appealService';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const FacultyAppeals: React.FC = () => {
    const [appeals, setAppeals] = useState<Appeal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAppeals = async () => {
        try {
            setIsLoading(true);
            setError('');
            const appealsData = await appealService.getAllAppeals();
            // Filter only pending appeals
            setAppeals(appealsData.filter(appeal => appeal.status === 'pending'));
        } catch (err) {
            console.error('Failed to fetch appeals:', err);
            setError('Failed to load appeals. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAppeals();
    }, []);

    const handleApprove = async (appealId: string, userId: string) => {
        if (!userId) {
            console.error("User ID is missing for appeal:", appealId);
            alert("Cannot process appeal: User ID is missing.");
            return;
        }
        
        try {
            await appealService.updateAppealStatus(appealId, userId, "approved");
            // Remove from list after successful approval
            setAppeals(appeals.filter(appeal => appeal.id !== appealId));
        } catch (error) {
            console.error('Failed to approve appeal:', error);
            alert('Failed to approve appeal. Please try again.');
        }
    };

    const handleReject = async (appealId: string, userId: string) => {
        if (!userId) {
            console.error("User ID is missing for appeal:", appealId);
            alert("Cannot process appeal: User ID is missing.");
            return;
        }
        
        try {
            await appealService.updateAppealStatus(appealId, userId, "rejected");
            // Remove from list after successful rejection
            setAppeals(appeals.filter(appeal => appeal.id !== appealId));
        } catch (error) {
            console.error('Failed to reject appeal:', error);
            alert('Failed to reject appeal. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <div className="flex justify-center items-center h-64">
                    <p className="text-gray-600 dark:text-gray-400">Loading appeals...</p>
                </div>
            </div>
        );
    }

    return (
        <div></div>
    );
};

export default FacultyAppeals;