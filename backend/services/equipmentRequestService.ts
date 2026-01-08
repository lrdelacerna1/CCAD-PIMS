import { EquipmentRequest, EquipmentRequestStatus } from '../../frontend/types';
import { equipmentRequests, areas, users } from '../db/mockDb';
import { NotificationService } from './notificationService';
import { AirSlateService } from './airSlateService';
// PenaltyService will be used later for returns

const uuidv4 = () => `eq-req-${Math.random().toString(36).substr(2, 9)}`;

export class EquipmentRequestService {
    
    static async getAll(): Promise<EquipmentRequest[]> {
        return JSON.parse(JSON.stringify(equipmentRequests));
    }

    static async getByUserId(userId: string): Promise<EquipmentRequest[]> {
        // HACK: For demo, show default user's requests if the current user has none.
        const userRequests = equipmentRequests.filter(r => r.userId === userId);
        if (userRequests.length === 0 && userId !== 'user-4') {
            return JSON.parse(JSON.stringify(equipmentRequests.filter(r => r.userId === 'user-4')));
        }
        return JSON.parse(JSON.stringify(userRequests));
    }

    static async create(data: Omit<EquipmentRequest, 'id' | 'status' | 'dateFiled'>): Promise<EquipmentRequest> {
        const requestingUser = users.find(u => u.id === data.userId);
        const isAdminRequest = requestingUser && (requestingUser.role === 'admin' || requestingUser.role === 'superadmin');

        const newRequest: EquipmentRequest = {
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

        equipmentRequests.unshift(newRequest);
        return { ...newRequest };
    }

    static async updateStatus(ids: string[], status: EquipmentRequestStatus, rejectionReason?: string): Promise<void> {
        equipmentRequests.forEach(req => {
            if (ids.includes(req.id)) {
                req.status = status;
                if (status === 'Rejected' && rejectionReason) {
                    req.rejectionReason = rejectionReason;
                }

                // Create a notification for the user
                const areaName = areas.find(a => a.id === req.requestedItems[0]?.areaId)?.name || 'an area';
                NotificationService.createNotification({
                    userId: req.userId,
                    message: `Your equipment request for '${req.purpose}' in ${areaName} was ${status.toLowerCase()}.`,
                    isRead: false, createdAt: new Date().toISOString(), equipmentRequestId: req.id,
                });
            }
        });
    }
}