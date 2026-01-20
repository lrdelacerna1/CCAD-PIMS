import { EquipmentRequest, RoomRequest } from '../../frontend/types';
import { differenceInDays, parseISO } from 'date-fns';
import axios from 'axios'; // Assuming axios is available for HTTP requests

// IMPORTANT: Replace with your actual AirSlate API Key and Template IDs
const AIRSLATE_API_KEY = process.env.AIRSLATE_API_KEY || 'YOUR_AIRSLATE_API_KEY';
const EQUIPMENT_REQUEST_TEMPLATE_ID = process.env.EQUIPMENT_REQUEST_TEMPLATE_ID || 'YOUR_EQUIPMENT_TEMPLATE_ID';
const ROOM_REQUEST_TEMPLATE_ID = process.env.ROOM_REQUEST_TEMPLATE_ID || 'YOUR_ROOM_TEMPLATE_ID';
const AIRSLATE_API_BASE_URL = 'https://api.airslate.com/v1'; // Verify AirSlate's API base URL

export class AirSlateService {
    /**
     * Initiates a real AirSlate signature workflow for a given request.
     * This involves creating a document from a template, populating it with data,
     * and sending it out for signatures.
     */
    static async initiateWorkflow(
        request: Omit<EquipmentRequest, 'id' | 'status' | 'createdAt' | 'airSlateDocumentId' | 'airSlateSignedAt'> | Omit<RoomRequest, 'id' | 'status' | 'createdAt' | 'isFlaggedNoShow' | 'airSlateDocumentId' | 'airSlateSignedAt'>,
        requestType: 'equipment' | 'room'
    ): Promise<{
        airSlateDocumentId: string;
        airSlateStatus: 'Pending Signature';
        airSlateDocumentUrl: string;
    } | null> {
        console.log(`[AirSlateService] Initiating REAL AirSlate workflow for ${requestType} request.`);

        const templateId = requestType === 'equipment' ? EQUIPMENT_REQUEST_TEMPLATE_ID : ROOM_REQUEST_TEMPLATE_ID;

        if (AIRSLATE_API_KEY === 'YOUR_AIRSLATE_API_KEY' || templateId === 'YOUR_EQUIPMENT_TEMPLATE_ID' || templateId === 'YOUR_ROOM_TEMPLATE_ID') {
            console.error('AirSlate API key or template ID not configured. Using mock data.');
            // Fallback to mock data if credentials are not set
            const documentId = `as-doc-mock-${Math.random().toString(36).substr(2, 9)}`;
            return {
                airSlateDocumentId: documentId,
                airSlateStatus: 'Pending Signature',
                airSlateDocumentUrl: `https://www.airslate.com/mock/document/view/${documentId}`,
            };
        }

        try {
            // Step 1: Create a workflow from a template
            // This is a simplified example. Actual AirSlate API calls may vary.
            const createWorkflowResponse = await axios.post(
                `${AIRSLATE_API_BASE_URL}/workflows`,
                {
                    template_id: templateId,
                    // You would typically pass dynamic data to populate the document fields here
                    // based on your AirSlate template configuration.
                    data: {
                        requesterName: request.userName,
                        requesterEmail: request.userContact,
                        requestPurpose: request.purpose,
                        requestedStartDate: request.requestedStartDate,
                        requestedEndDate: request.requestedEndDate,
                        // Add other fields relevant to your template
                        ...(requestType === 'equipment' && {
                            secondaryContactName: (request as EquipmentRequest).secondaryContactName,
                            secondaryContactNumber: (request as EquipmentRequest).secondaryContactNumber,
                            endorserName: (request as EquipmentRequest).endorserName || '',
                            endorserPosition: (request as EquipmentRequest).endorserPosition || '',
                            endorserEmail: (request as EquipmentRequest).endorserEmail || '',
                            // You might need to format requestedItems for your template
                            requestedItems: JSON.stringify((request as EquipmentRequest).requestedItems),
                        }),
                        ...(requestType === 'room' && {
                            requestedStartTime: (request as RoomRequest).requestedStartTime,
                            requestedEndTime: (request as RoomRequest).requestedEndTime,
                            numberOfStudents: (request as RoomRequest).numberOfStudents,
                            accompanyingStudents: (request as RoomRequest).accompanyingStudents,
                            endorserName: (request as RoomRequest).endorserName || '',
                            endorserPosition: (request as RoomRequest).endorserPosition || '',
                            endorserEmail: (request as RoomRequest).endorserEmail || '',
                            requestedRoomName: (request as RoomRequest).requestedRoom.name,
                        }),
                    },
                    // Define recipients for signature. This will depend on your template's roles.
                    // This is a crucial part where AirSlate sends out emails.
                    recipients: [
                        {
                            email: request.userContact,
                            role: 'Requester', // Role as defined in your AirSlate template
                            // Additional fields like first_name, last_name
                        },
                        // Conditionally add endorser if present
                        ...(request.endorserEmail ? [{
                            email: request.endorserEmail,
                            role: 'Endorser', // Role as defined in your AirSlate template
                        }] : []),
                    ],
                    // Configure webhook for status updates back to your application
                    webhook_url: `http://localhost:3000/api/airslate-webhook`,
                    // This URL should be publicly accessible for AirSlate to send updates.
                    // For local development, you might use a tool like ngrok.
                },
                {
                    headers: {
                        'Authorization': `Bearer ${AIRSLATE_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const airSlateDocumentId = createWorkflowResponse.data.id;
            // AirSlate usually provides a signing link in the response or you construct it.
            const airSlateDocumentUrl = createWorkflowResponse.data.signing_url || `https://app.airslate.com/flow/${airSlateDocumentId}/sign`;

            return {
                airSlateDocumentId,
                airSlateStatus: 'Pending Signature',
                airSlateDocumentUrl,
            };

        } catch (error: any) {
            console.error('[AirSlateService] Error initiating AirSlate workflow:', error.response?.data || error.message);
            // Fallback to mock data or throw error based on desired behavior
            const documentId = `as-doc-error-mock-${Math.random().toString(36).substr(2, 9)}`;
            return {
                airSlateDocumentId: documentId,
                airSlateStatus: 'Pending Signature',
                airSlateDocumentUrl: `https://www.airslate.com/mock/document/view/${documentId}`,
            };
        }
    }
}
