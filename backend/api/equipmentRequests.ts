import { EquipmentRequest, EquipmentRequestStatus } from '../../frontend/types';
import { EquipmentRequestService } from '../services/equipmentRequestService';
import { AirSlateService } from '../services/airSlateService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(data), 300));

export const getAllEquipmentRequestsApi = async (): Promise<EquipmentRequest[]> => {
    const data = await EquipmentRequestService.getAll();
    return simulateNetworkDelay(data);
};

export const getEquipmentRequestsByUserIdApi = async (userId: string): Promise<EquipmentRequest[]> => {
    const data = await EquipmentRequestService.getByUserId(userId);
    return simulateNetworkDelay(data);
};

export const createEquipmentRequestApi = async (data: Omit<EquipmentRequest, 'id' | 'status' | 'createdAt' | 'airSlateDocumentId' | 'airSlateSignedAt'>): Promise<{ airSlateDocumentUrl: string }> => {
    console.log('[API] Initiating AirSlate workflow for new Equipment Request');
    const workflowResult = AirSlateService.initiateWorkflow(data, 'equipment');

    if (!workflowResult) {
        throw new Error('Failed to initiate AirSlate workflow.');
    }

    // Instead of creating the request directly, we return the URL for the user to sign.
    // The actual request creation will happen via the webhook after signing is complete.
    return simulateNetworkDelay({ airSlateDocumentUrl: workflowResult.airSlateDocumentUrl });
};

export const updateEquipmentRequestStatusApi = async (ids: string[], status: EquipmentRequestStatus, rejectionReason?: string): Promise<void> => {
    await EquipmentRequestService.updateStatus(ids, status, rejectionReason);
    return simulateNetworkDelay(undefined);
};