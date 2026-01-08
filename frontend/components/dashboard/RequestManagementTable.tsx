import React from 'react';
// FIX: Use specific request types instead of the legacy Reservation type.
import { EquipmentRequest, RoomRequest, User } from '../../types';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { UserIcon, AcademicCapIcon, BriefcaseIcon } from '../Icons';

// FIX: Define a union type for easier prop handling.
type AnyRequest = EquipmentRequest | RoomRequest;

interface RequestManagementTableProps {
    requests: AnyRequest[];
    areasMap: Map<string, string>;
    usersMap: Map<string, User>;
    selectedIds: Set<string>;
    onSelectionChange: (id: string, isSelected: boolean) => void;
    onSelectAll: (areAllSelected: boolean) => void;
    onApprove: (ids: string[]) => void;
    onReject: (ids: string[]) => void;
    onRowClick: (reservation: AnyRequest) => void;
}

const RequestManagementTable: React.FC<RequestManagementTableProps> = ({
    requests,
    areasMap,
    usersMap,
    selectedIds,
    onSelectionChange,
    onSelectAll,
    onApprove,
    onReject,
    onRowClick,
}) => {
    const areAllSelected = requests.length > 0 && selectedIds.size === requests.length;

    const getAreaId = (req: AnyRequest) => {
        if ('requestedItems' in req) return req.requestedItems[0]?.areaId;
        if ('requestedRoom' in req) return req.requestedRoom.areaId;
        return '';
    };

    const getTime = (req: AnyRequest) => {
        if ('requestedStartTime' in req) {
            return `${req.requestedStartTime} - ${req.requestedEndTime}`;
        }
        return 'All Day';
    };

    return (
        <div>
            <div className="p-4 flex items-center gap-4 bg-gray-50 dark:bg-gray-700">
                <Button
                    onClick={() => onApprove(Array.from(selectedIds))}
                    disabled={selectedIds.size === 0}
                    className="!w-auto"
                    variant="success"
                >
                    Approve Selected ({selectedIds.size})
                </Button>
                <Button
                    onClick={() => onReject(Array.from(selectedIds))}
                    disabled={selectedIds.size === 0}
                    variant="danger"
                    className="!w-auto"
                >
                    Reject Selected ({selectedIds.size})
                </Button>
            </div>
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                        <th scope="col" className="p-4">
                            <Checkbox
                                id="select-all"
                                label=""
                                checked={areAllSelected}
                                onChange={() => onSelectAll(areAllSelected)}
                                aria-label="Select all requests"
                            />
                        </th>
                        <th scope="col" className="px-6 py-3">Reserved By</th>
                        <th scope="col" className="px-6 py-3">Area</th>
                        <th scope="col" className="px-6 py-3">Date & Time</th>
                        <th scope="col" className="px-6 py-3">Purpose</th>
                        <th scope="col" className="px-6 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.length > 0 ? requests.map((req) => (
                        <tr
                            key={req.id}
                            className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                            onClick={() => onRowClick(req)}
                        >
                            <td className="w-4 p-4" onClick={e => e.stopPropagation()}>
                                <Checkbox
                                    id={`select-${req.id}`}
                                    label=""
                                    checked={selectedIds.has(req.id)}
                                    onChange={(e) => onSelectionChange(req.id, e.target.checked)}
                                    aria-label={`Select request from ${req.userName}`}
                                />
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                    {(() => {
                                        const userForRequest = usersMap.get(req.userId);
                                        if (!userForRequest) {
                                            return <UserIcon className="w-5 h-5 text-slate-400 flex-shrink-0" title="User" />;
                                        }
                                        switch (userForRequest.role) {
                                            case 'user':
                                                return <AcademicCapIcon className="w-5 h-5 text-slate-500 flex-shrink-0" title="Student/User" />;
                                            case 'admin':
                                            case 'superadmin':
                                                return <BriefcaseIcon className="w-5 h-5 text-slate-500 flex-shrink-0" title="Admin/Staff" />;
                                            default:
                                                return <UserIcon className="w-5 h-5 text-slate-400 flex-shrink-0" title="User" />;
                                        }
                                    })()}
                                    <span className="font-medium text-slate-900 whitespace-nowrap dark:text-white">{req.userName}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">{areasMap.get(getAreaId(req)) || 'Unknown'}</td>
                            <td className="px-6 py-4">
                                {/* FIX: Use 'requestedStartDate' property */}
                                {new Date(req.requestedStartDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                                <br/>
                                <span className="text-xs">{getTime(req)}</span>
                            </td>
                            <td className="px-6 py-4">{req.purpose}</td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                <div className="flex gap-2">
                                    <button onClick={() => onApprove([req.id])} className="font-medium text-green-600 dark:text-green-500 hover:underline">Approve</button>
                                    <button onClick={() => onReject([req.id])} className="font-medium text-red-600 dark:text-red-500 hover:underline">Reject</button>
                                </div>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="text-center p-6 text-gray-500 dark:text-gray-400">
                                No requests are currently pending approval.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default RequestManagementTable;