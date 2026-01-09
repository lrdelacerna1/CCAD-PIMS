
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
import { RoomRequest, RoomRequestStatus, User } from '../../frontend/types';
import { NotificationService } from './notificationService';
import { AirSlateService } from './airSlateService';

const roomRequestsCollection = collection(db, "roomRequests");
const usersCollection = collection(db, "users");

export class RoomRequestService {
    
    static async getAll(): Promise<RoomRequest[]> {
        const q = query(roomRequestsCollection, orderBy("dateFiled", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateFiled: (data.dateFiled as any).toDate().toISOString(),
            } as RoomRequest;
        });
    }

    static async getByUserId(userId: string): Promise<RoomRequest[]> {
        const q = query(roomRequestsCollection, where("userId", "==", userId), orderBy("dateFiled", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateFiled: (data.dateFiled as any).toDate().toISOString(),
            } as RoomRequest;
        });
    }

    static async create(data: Omit<RoomRequest, 'id' | 'status' | 'dateFiled'>): Promise<RoomRequest> {
        const userRef = doc(db, "users", data.userId);
        const userSnap = await getDoc(userRef);
        const requestingUser = userSnap.exists() ? userSnap.data() as User : null;
        
        const isAdminRequest = requestingUser && (requestingUser.role === 'admin' || requestingUser.role === 'areaManager');

        const newRequestData: any = {
            ...data,
            status: isAdminRequest ? 'For Approval' : 'Pending Confirmation',
            dateFiled: serverTimestamp(),
        };

        if (!isAdminRequest) {
            const airSlateData = AirSlateService.initiateWorkflow(newRequestData as RoomRequest);
            if (airSlateData) {
                Object.assign(newRequestData, airSlateData);
            }
        }

        const docRef = await addDoc(roomRequestsCollection, newRequestData);
        
        const newDocSnap = await getDoc(docRef);
        const createdRequest = newDocSnap.data();

        return {
            id: docRef.id,
            ...createdRequest,
            dateFiled: (createdRequest?.dateFiled as any).toDate().toISOString(),
        } as RoomRequest;
    }

    static async updateStatus(ids: string[], status: RoomRequestStatus, rejectionReason?: string): Promise<void> {
        const batch = writeBatch(db);

        for (const id of ids) {
            const reqRef = doc(db, "roomRequests", id);
            const updateData: any = { status };
            if (status === 'Rejected' && rejectionReason) {
                updateData.rejectionReason = rejectionReason;
            }
            batch.update(reqRef, updateData);
        }
        
        await batch.commit();

        for (const id of ids) {
            const reqDoc = await getDoc(doc(db, "roomRequests", id));
            if (reqDoc.exists()) {
                const req = reqDoc.data() as RoomRequest;
                NotificationService.createNotification({
                    userId: req.userId,
                    message: `Your room request for purpose \'${req.purpose}\' was ${status.toLowerCase()}.`,
                    isRead: false,
                    roomRequestId: id,
                });
            }
        }
    }
}
