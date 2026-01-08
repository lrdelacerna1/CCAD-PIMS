import { RoomRequest, RoomRequestStatus } from '../../frontend/types';
import { roomRequests, areas, users } from '../db/mockDb';
import { NotificationService } from './notificationService';
import { AirSlateService } from './airSlateService';

const uuidv4 = () => `room-req-${Math.random().toString(36).substr(2, 9)}`;

export class RoomRequestService {
    
    static async getAll(): Promise<RoomRequest[]> {
        return JSON.parse(JSON.stringify(roomRequests));
    }

    static async getByUserId(userId: string): Promise<RoomRequest[]> {
        // HACK: For demo, show default user's requests if the current user has none.
        const userRequests = roomRequests.filter(r => r.userId === userId);
        if (userRequests.length === 0 && userId !== 'user-4') {
            return JSON.parse(JSON.stringify(roomRequests.filter(r => r.userId === 'user-4')));
        }
        return JSON.parse(JSON.stringify(userRequests));
    }

    static async create(data: Omit<RoomRequest, 'id' | 'status' | 'dateFiled'>): Promise<RoomRequest> {
        const requestingUser = users.find(u => u.id === data.userId);
        const isAdminRequest = requestingUser && (requestingUser.role === 'admin' || requestingUser.role === 'superadmin');

        const newRequest: RoomRequest = {
            id: uuidv4(),
            status: isAdminRequest ? 'For Approval' : 'Pending Confirmation',
            dateFiled: new Date().toISOString(),
            ...data,
        };
        
        // Only initiate workflow for non-admins who need endorsement
        if (!isAdminRequest) {
            const airSlateData = AirSlateService.initiateWorkflow(newRequest);
            if (airSlateData) {
                Object.assign(newRequest, airSlateData);
            }
        }

        roomRequests.unshift(newRequest);
        return { ...newRequest };
    }

    static async updateStatus(ids: string[], status: RoomRequestStatus, rejectionReason?: string): Promise<void> {
        roomRequests.forEach(req => {
            if (ids.includes(req.id)) {
                req.status = status;
                if (status === 'Rejected' && rejectionReason) {
                    req.rejectionReason = rejectionReason;
                }

                // Create a notification for the user
                const areaName = areas.find(a => a.id === req.requestedRoom.areaId)?.name || 'an area';
                NotificationService.createNotification({
                    userId: req.userId,
                    message: `Your room request for '${req.purpose}' in ${areaName} was ${status.toLowerCase()}.`,
                    isRead: false, createdAt: new Date().toISOString(), roomRequestId: req.id,
                });
            }
        });
    }
}