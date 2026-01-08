import { EquipmentRequest, RoomRequest } from '../../frontend/types';
import { differenceInDays, parseISO } from 'date-fns';

const uuidv4 = () => `as-doc-${Math.random().toString(36).substr(2, 9)}`;

export class AirSlateService {
    /**
     * Simulates initiating a multi-level approval workflow for every request.
     */
    static initiateWorkflow(request: EquipmentRequest | RoomRequest): {
        airSlateDocumentId: string;
        airSlateStatus: 'Pending Signature';
        airSlateDocumentUrl: string;
    } | null {
        // No longer conditional - every request gets a workflow.
        const documentId = uuidv4();
        return {
            airSlateDocumentId: documentId,
            airSlateStatus: 'Pending Signature',
            // This is a mock URL. In a real scenario, this would point to the actual document.
            airSlateDocumentUrl: `https://www.airslate.com/mock/document/view/${documentId}`,
        };
    }
}
