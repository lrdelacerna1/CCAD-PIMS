
import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    doc,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { EquipmentRequest, EquipmentRequestStatus, User } from '../../frontend/types';
import { NotificationService } from './notificationService';
import { AirSlateService } from './airSlateService';

const equipmentRequestsCollection = collection(db, "equipmentRequests");
const usersCollection = collection(db, "users");

export class EquipmentRequestService {
    
    static async getAll(): Promise<EquipmentRequest[]> {
        const q = query(equipmentRequestsCollection, orderBy("dateFiled", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateFiled: (data.dateFiled as any).toDate().toISOString(),
            } as EquipmentRequest;
        });
    }

    static async getByUserId(userId: string): Promise<EquipmentRequest[]> {
        const q = query(equipmentRequestsCollection, where("userId", "==", userId), orderBy("dateFiled", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateFiled: (data.dateFiled as any).toDate().toISOString(),
            } as EquipmentRequest;
        });
    }

    static async create(data: Omit<EquipmentRequest, 'id' | 'status' | 'dateFiled'>): Promise<EquipmentRequest> {
        const userRef = doc(db, "users", data.userId);
        const userSnap = await getDoc(userRef);
        const requestingUser = userSnap.exists() ? userSnap.data() as User : null;
        
        const isAdminRequest = requestingUser && (requestingUser.role === 'admin' || requestingUser.role === 'areaManager');

        const newRequestData: any = {
            ...data,
            status: isAdminRequest ? 'For Approval' : 'Pending Confirmation',
            dateFiled: serverTimestamp(),
            isFlaggedNoShow: false, // Default value
        };

        if (!isAdminRequest) {
            const airSlateData = AirSlateService.initiateWorkflow(newRequestData as EquipmentRequest);
            if (airSlateData) {
                Object.assign(newRequestData, airSlateData);
            }
        }

        const docRef = await addDoc(equipmentRequestsCollection, newRequestData);
        
        // We fetch the document again to get the server-generated timestamp
        const newDocSnap = await getDoc(docRef);
        const createdRequest = newDocSnap.data();

        return {
            id: docRef.id,
            ...createdRequest,
            dateFiled: (createdRequest?.dateFiled as any).toDate().toISOString(),
        } as EquipmentRequest;
    }

    static async updateStatus(ids: string[], status: EquipmentRequestStatus, rejectionReason?: string): Promise<void> {
        const batch = writeBatch(db);

        for (const id of ids) {
            const reqRef = doc(db, "equipmentRequests", id);
            const updateData: any = { status };
            if (status === 'Rejected' && rejectionReason) {
                updateData.rejectionReason = rejectionReason;
            }
            batch.update(reqRef, updateData);
        }
        
        await batch.commit();

        // Create notifications after the batch has been committed
        for (const id of ids) {
            const reqDoc = await getDoc(doc(db, "equipmentRequests", id));
            if (reqDoc.exists()) {
                const req = reqDoc.data() as EquipmentRequest;
                 NotificationService.createNotification({
                    userId: req.userId,
                    message: `Your equipment request for purpose \'${req.purpose}\' was ${status.toLowerCase()}.`,
                    isRead: false,
                    equipmentRequestId: id,
                });
            }
        }
    }
}
