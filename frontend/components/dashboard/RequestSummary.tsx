import React, { useState, useMemo } from 'react';
import { EquipmentRequest, RoomRequest } from '../../types';
import { Card } from '../ui/Card';

type AnyRequest = EquipmentRequest | RoomRequest;

interface RequestSummaryProps {
    equipmentRequests: EquipmentRequest[];
    roomRequests: RoomRequest[];
}

const getStatusCounts = (requests: AnyRequest[]) => {
    const counts = {
        pending: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
        cancelled: 0,
        overdue: 0,
    };

    requests.forEach(req => {
        switch (req.status) {
            case 'Pending Confirmation':
            case 'For Approval':
                counts.pending++;
                break;
            case 'Ready for Pickup':
            case 'Ready for Check-in':
                counts.approved++;
                break;
            case 'Closed':
                counts.completed++;
                break;
            case 'Rejected':
                counts.rejected++;
                break;
            case 'Cancelled':
                counts.cancelled++;
                break;
            case 'Overdue':
                counts.overdue++;
                break;
        }
    });
    return counts;
};


const StatusRow: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => {
    if (count === 0) return null;
    return (
        <li className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${color}`}></span>
                <span className="text-slate-600 dark:text-slate-400">{label}</span>
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{count}</span>
        </li>
    );
};


const RequestSummary: React.FC<RequestSummaryProps> = ({ equipmentRequests, roomRequests }) => {
    const [activeTab, setActiveTab] = useState<'equipment' | 'rooms'>('equipment');

    const { total, counts } = useMemo(() => {
        const requests = activeTab === 'equipment' ? equipmentRequests : roomRequests;
        return {
            total: requests.length,
            counts: getStatusCounts(requests),
        };
    }, [activeTab, equipmentRequests, roomRequests]);

    const activeTabClasses = "bg-up-maroon-100 text-up-maroon-800 dark:bg-up-maroon-900/50 dark:text-up-maroon-300";
    const inactiveTabClasses = "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700";

    return (
        <Card className="!max-w-none !p-0 h-full flex flex-col border-t-4 border-t-up-maroon-700">
            <div className="p-4 border-b dark:border-slate-700">
                 <h2 className="text-xl font-semibold dark:text-white mb-4 font-heading">Request Summary</h2>
                 <div className="flex space-x-2 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                    <button onClick={() => setActiveTab('equipment')} className={`w-full py-2 px-4 text-sm font-semibold rounded-md transition-colors ${activeTab === 'equipment' ? activeTabClasses : inactiveTabClasses}`}>
                        Equipment
                    </button>
                    <button onClick={() => setActiveTab('rooms')} className={`w-full py-2 px-4 text-sm font-semibold rounded-md transition-colors ${activeTab === 'rooms' ? activeTabClasses : inactiveTabClasses}`}>
                        Rooms
                    </button>
                </div>
            </div>
            <div className="p-6 flex flex-col items-center justify-center flex-grow">
                 <p className="text-6xl font-bold text-slate-900 dark:text-white mb-2 font-heading">{total}</p>
                 <p className="text-slate-500 dark:text-slate-400 mb-6">Total {activeTab === 'equipment' ? 'Equipment' : 'Room'} Requests</p>
                 <ul className="space-y-3 w-full">
                     <StatusRow label="Pending" count={counts.pending} color="bg-up-gold-500" />
                     <StatusRow label="Approved" count={counts.approved} color="bg-up-green-600" />
                     <StatusRow label="Completed" count={counts.completed} color="bg-slate-500" />
                     <StatusRow label="Overdue" count={counts.overdue} color="bg-rose-500" />
                     <StatusRow label="Rejected" count={counts.rejected} color="bg-red-500" />
                     <StatusRow label="Cancelled" count={counts.cancelled} color="bg-slate-400" />
                 </ul>
            </div>
        </Card>
    );
};

export default RequestSummary;