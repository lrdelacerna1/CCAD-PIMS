import React from 'react';
import { EquipmentRequest, RoomRequest, Penalty } from '../../types';
import { Button } from '../ui/Button';
import { format } from 'date-fns';
import {
    XIcon,
    InventoryIcon,
    BuildingOfficeIcon,
    XCircleIcon,
    ClipboardDocumentCheckIcon,
    ExclamationTriangleIcon,
    DocumentDuplicateIcon,
} from '../Icons';
import { useAuth } from '../../hooks/useAuth';
import { createPenaltyApi } from '../../../backend/api/penalties';
import { updateRoomRequestStatusApi } from '../../../backend/api/roomRequests';

type AnyRequest = EquipmentRequest | RoomRequest;

const StatusBadge: React.FC<{ status: string, large?: boolean }> = ({ status, large = false }) => {
    const baseClasses = large
        ? "px-3 py-1 text-sm font-medium rounded-full inline-flex items-center gap-2"
        : "px-2 py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap";
    
    const colorKey = status.split(' ')[0].toLowerCase();
    const colors: { [key: string]: string } = {
        'approved': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        'pending': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        'for': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        'rejected': 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
        'ready': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
        'equipment': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
        'overdue': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        'closed': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
        'cancelled': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
        'checked': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
        'no-show': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    };
    return <span className={`${baseClasses} ${colors[colorKey] || colors['closed']}`}>{status}</span>;
};

const ReadOnlyField: React.FC<{ label: string; value: string | number; className?: string, multiline?: boolean }> = ({ label, value, className, multiline = false }) => (
    <div className={className}>
        <label className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
        </label>
        <div className={`w-full p-2.5 bg-slate-50 border border-slate-300 text-slate-900 sm:text-sm rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white ${multiline ? 'whitespace-pre-wrap min-h-[5rem]' : ''}`}>
            {value || 'N/A'}
        </div>
    </div>
);

const ConditionalInfoCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; colorClass: string; }> = ({ icon, title, children, colorClass }) => {
    return (
        <div className={`p-4 rounded-lg border mb-4 ${colorClass}`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <h4 className="font-semibold">{title}</h4>
            </div>
            <div className="space-y-2 text-sm">
                {children}
            </div>
        </div>
    );
}

const ReservationDetailsModal: React.FC<{
    reservation: AnyRequest;
    onClose: () => void;
    onUpdate?: () => void;
}> = ({ reservation, onClose, onUpdate }) => {
    const { user } = useAuth();
    const isEquipment = 'requestedItems' in reservation;

    const handleFlagNoShow = async () => {
        if (isEquipment) return;

        const penalty: Omit<Penalty, 'id'> = {
            userId: reservation.userId,
            userName: reservation.userName,
            requestType: 'room',
            requestId: reservation.id,
            reason: 'Room No-Show',
            details: `User did not show up for the room reservation for ${reservation.requestedRoom.name}`,
            amount: 25, // Example amount
            isPaid: false,
            createdAt: new Date().toISOString(),
        };
        await createPenaltyApi(penalty);
        await updateRoomRequestStatusApi(reservation.id, 'no-show');
        if(onUpdate) onUpdate();
        onClose();
    };

    const startDateStr = format(new Date(reservation.requestedStartDate + 'T00:00:00Z'), 'yyyy-MM-dd');
    const endDateStr = format(new Date(reservation.requestedEndDate + 'T00:00:00Z'), 'yyyy-MM-dd');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-lg">
                    <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-full ${isEquipment ? 'bg-sky-100 dark:bg-sky-900/50' : 'bg-indigo-100 dark:bg-indigo-900/50'}`}>
                            {isEquipment ? <InventoryIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" /> : <BuildingOfficeIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {isEquipment ? 'Equipment Request' : 'Room Request'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Ref: {reservation.id}</p>
                        </div>
                    </div>
                    <StatusBadge status={reservation.status} />
                </div>

                {/* Body - Mimicking the Create Request Layout */}
                <div className="p-6 space-y-4 overflow-y-auto flex-grow">
                    
                    {reservation.rejectionReason && (
                        <ConditionalInfoCard icon={<XCircleIcon className="w-5 h-5"/>} title="Rejection Reason" colorClass="bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800">
                            {reservation.rejectionReason}
                        </ConditionalInfoCard>
                    )}
                    {reservation.status === 'Cancelled' && (
                         <ConditionalInfoCard icon={<ExclamationTriangleIcon className="w-5 h-5"/>} title="Cancellation Info" colorClass="bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-900/40 dark:text-violet-200 dark:border-violet-800">
                            Cancelled on {reservation.cancelledAt ? format(new Date(reservation.cancelledAt), 'MMM d, yyyy, h:mm a') : 'N/A'}
                        </ConditionalInfoCard>
                    )}
                    {isEquipment && reservation.returnDetails && (
                         <ConditionalInfoCard icon={<ClipboardDocumentCheckIcon className="w-5 h-5"/>} title="Return Details" colorClass="bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-700/50 dark:text-slate-200 dark:border-slate-600">
                            <p><strong>Condition:</strong> {reservation.returnDetails.condition}</p>
                            <p><strong>Notes:</strong> {reservation.returnDetails.notes}</p>
                            <p><strong>Returned At:</strong> {format(new Date(reservation.returnDetails.returnedAt), 'MMM d, yyyy, h:mm a')}</p>
                         </ConditionalInfoCard>
                    )}
                    {reservation.airSlateDocumentId && (
                        <ConditionalInfoCard 
                            icon={<DocumentDuplicateIcon className="w-5 h-5"/>} 
                            title="Approval Workflow" 
                            colorClass="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800"
                        >
                            <div className="flex justify-between items-center">
                                <p><strong>Status:</strong> {reservation.airSlateStatus}</p>
                                <Button 
                                    variant="secondary" 
                                    className="!w-auto !py-1 !px-3 text-xs"
                                    onClick={() => window.open(reservation.airSlateDocumentUrl, '_blank')}
                                >
                                    View Document
                                </Button>
                            </div>
                        </ConditionalInfoCard>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <ReadOnlyField label="Start Date" value={startDateStr} />
                        <ReadOnlyField label="End Date" value={endDateStr} />
                    </div>

                    <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
                            {isEquipment ? 'Requested Items' : 'Requested Room'}
                        </p>
                        {isEquipment ? (
                            <div className="space-y-2">
                                {Array.from(reservation.requestedItems.reduce((acc, item) => {
                                    acc.set(item.name, (acc.get(item.name) || 0) + 1);
                                    return acc;
                                }, new Map<string, number>()).entries()).map(([name, count]) => (
                                    <div key={name} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-600">
                                        <span className="text-sm text-slate-600 dark:text-slate-300">{name}</span>
                                        <span className="font-semibold text-sm text-slate-800 dark:text-white">x{count}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 p-2 rounded border dark:border-slate-600">
                                <span className="text-sm text-slate-800 dark:text-slate-200 font-medium">{reservation.requestedRoom.name}</span>
                            </div>
                        )}
                    </div>

                    {!isEquipment && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <ReadOnlyField label="Start Time" value={reservation.requestedStartTime} />
                                <ReadOnlyField label="End Time" value={reservation.requestedEndTime} />
                            </div>
                            <div className="grid grid-cols-1">
                                 <ReadOnlyField label="Number of Students" value={reservation.numberOfStudents} />
                            </div>
                            <ReadOnlyField label="Accompanying Students" value={reservation.accompanyingStudents} multiline />
                        </>
                    )}

                    <ReadOnlyField label="Purpose" value={reservation.purpose} multiline />
                    
                    {reservation.endorserEmail && (
                        <div className="pt-4 border-t dark:border-slate-600">
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-4">Endorser Information</h4>
                            <div className="space-y-4">
                                {reservation.endorserName && <ReadOnlyField label="Name" value={reservation.endorserName} />}
                                {reservation.endorserPosition && <ReadOnlyField label="Position" value={reservation.endorserPosition} />}
                                <ReadOnlyField label="Email" value={reservation.endorserEmail} />
                            </div>
                        </div>
                    )}

                    {isEquipment && (
                        <>
                            <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200 pt-4 border-t dark:border-slate-600">Secondary Contact</h4>
                            <div className="grid grid-cols-1 gap-4">
                                <ReadOnlyField label="Name" value={reservation.secondaryContactName} />
                                <ReadOnlyField label="Contact Number" value={reservation.secondaryContactNumber} />
                            </div>
                        </>
                    )}
                    
                    <div className="pt-2 text-xs text-slate-400 dark:text-slate-500 text-center">
                        Request filed on {format(new Date(reservation.dateFiled), 'MMM d, yyyy, h:mm a')}
                    </div>

                </div>

                <div className="p-6 flex justify-between items-center border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 rounded-b-lg">
                    <div>
                        {user?.role === 'admin' && !isEquipment && reservation.status === 'approved' && (
                            <Button onClick={handleFlagNoShow} variant="warning" className="!w-auto">
                                Flag as No-Show
                            </Button>
                        )}
                    </div>
                    <Button onClick={onClose} className="!w-auto" variant="secondary">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ReservationDetailsModal;
