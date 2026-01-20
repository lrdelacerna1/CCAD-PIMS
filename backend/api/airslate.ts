import { EquipmentRequestService } from '../services/equipmentRequestService';
import { RoomRequestService } from '../services/roomRequestService';
import { EquipmentRequest, RoomRequest } from '../../frontend/types';

interface AirSlateWebhookPayload {
    documentId: string;
    status: 'signed' | 'declined';
    // In a real payload, you'd have structured data about the signers
    // and the final, signed document URL.
    signedData: {
        request: EquipmentRequest | RoomRequest;
        requestType: 'equipment' | 'room';
    };
    rejectionReason?: string;
}

// This is a mock of a secure, incoming webhook from AirSlate.
export const handleAirSlateWebhookApi = async (payload: AirSlateWebhookPayload): Promise<{ success: boolean; message: string }> => {
    console.log(`[Webhook] Received webhook for AirSlate document ${payload.documentId} with status: ${payload.status}`);

    try {
        // In a real-world scenario, you would first verify a secret token
        // in the request header to ensure the webhook is from AirSlate.

        if (payload.status === 'signed') {
            const { request, requestType } = payload.signedData;
            
            const finalStatus = request.endorserEmail ? 'pending-endorsement' : 'pending-approval';

            if (requestType === 'equipment') {
                const newEquipmentRequest: Omit<EquipmentRequest, 'id'> = {
                    ...(request as EquipmentRequest),
                    status: finalStatus,
                    airSlateDocumentId: payload.documentId,
                    airSlateSignedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                };
                await EquipmentRequestService.create(newEquipmentRequest);
                return { success: true, message: 'Equipment request created successfully from signed document.' };
            }

            else if (requestType === 'room') {
                const newRoomRequest: Omit<RoomRequest, 'id'> = {
                    ...(request as RoomRequest),
                    status: finalStatus,
                    airSlateDocumentId: payload.documentId,
                    airSlateSignedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                };
                await RoomRequestService.create(newRoomRequest);
                return { success: true, message: 'Room request created successfully from signed document.' };
            }
        }
        
        else if (payload.status === 'declined') {
            // Optionally, handle cases where a signature is declined.
            // You might want to update an internal record to show the request was abandoned.
            console.log(`[Webhook] Signature was declined for document ${payload.documentId}. Reason: ${payload.rejectionReason || 'Not provided'}`);
            return { success: true, message: 'Webhook processed for declined signature.' };
        }

        return { success: false, message: 'Invalid webhook status.' };

    } catch (error: any) {
        console.error('[Webhook] Error processing AirSlate webhook:', error);
        return { success: false, message: error.message || 'An unexpected error occurred.' };
    }
};
