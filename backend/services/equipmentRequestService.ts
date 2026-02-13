import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    doc,
    query,
    orderBy,
    where,
    serverTimestamp,
    writeBatch
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { EquipmentRequest, EquipmentRequestStatus } from '../../frontend/types';
import { NotificationService } from "./notificationService";

interface User {
    id: string;
    role: 'student' | 'admin' | 'superadmin' | 'faculty' | 'guest';
}

const equipmentRequestsCollection = collection(db, "equipmentRequests");
const usersCollection = collection(db, "users");

export const EquipmentRequestService = {
    
    async getAll(): Promise<EquipmentRequest[]> {
        const q = query(equipmentRequestsCollection, orderBy("dateFiled", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateFiled: data.dateFiled?.toDate?.()?.toISOString() || new Date().toISOString(),
            } as EquipmentRequest;
        });
    },

    async getByUserId(userId: string): Promise<EquipmentRequest[]> {
        const q = query(equipmentRequestsCollection, where("userId", "==", userId), orderBy("dateFiled", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateFiled: data.dateFiled?.toDate?.()?.toISOString() || new Date().toISOString(),
            } as EquipmentRequest;
        });
    },
    
    async getByEndorserEmail(endorserEmail: string): Promise<EquipmentRequest[]> {
        const q = query(equipmentRequestsCollection, where("endorserEmail", "==", endorserEmail), orderBy("dateFiled", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateFiled: data.dateFiled?.toDate?.()?.toISOString() || new Date().toISOString(),
            } as EquipmentRequest;
        });
    },

    async create(data: Omit<EquipmentRequest, 'id' | 'status' | 'dateFiled'>): Promise<EquipmentRequest> {
        const userRef = doc(db, "users", data.userId);
        const userSnap = await getDoc(userRef);
        const requestingUser = userSnap.exists() ? (userSnap.data() as User) : null;
        
        const needsEndorsement = requestingUser && (requestingUser.role === 'student' || requestingUser.role === 'guest');
        const initialStatus: EquipmentRequestStatus = needsEndorsement ? 'Pending Endorsement' : 'Pending Approval';

        const newRequestData = {
            ...data,
            status: initialStatus,
            dateFiled: serverTimestamp(),
        };

        const docRef = await addDoc(equipmentRequestsCollection, newRequestData);
        const newDocSnap = await getDoc(docRef);
        const createdData = newDocSnap.data();

        // Notify endorser if applicable
        if (initialStatus === 'Pending Endorsement' && data.endorserEmail) {
            // In a real app, this might trigger an email. 
            // Since we use in-app notifications and don't easily map email to userId without a lookup, 
            // we'll skip direct user notification for endorser unless we find them.
            const endorserQuery = query(usersCollection, where("email", "==", data.endorserEmail));
            const endorserSnapshot = await getDocs(endorserQuery);
            if (!endorserSnapshot.empty) {
                const endorserId = endorserSnapshot.docs[0].id;
                await NotificationService.createNotification({
                    userId: endorserId,
                    title: "New Endorsement Request",
                    message: `${data.userName} has requested your endorsement for equipment.`,
                    isRead: false,
                    link: "/my-endorsements"
                });
            }
        }

        return {
            id: docRef.id,
            ...createdData,
            dateFiled: createdData?.dateFiled?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as EquipmentRequest;
    },

    async updateStatus(id: string, status: EquipmentRequestStatus, rejectionReason?: string): Promise<void> {
        const reqRef = doc(db, "equipmentRequests", id);
        
        // Fetch request first to get details for notification
        const reqSnap = await getDoc(reqRef);
        if (!reqSnap.exists()) return;
        const request = reqSnap.data() as EquipmentRequest;
        const oldStatus = request.status;

        const updateData: any = { status };
        
        if (status === 'Rejected' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }
        
        await updateDoc(reqRef, updateData);

        // Notify Requester
        await NotificationService.createNotification({
            userId: request.userId,
            title: "Request Status Updated",
            message: `Your equipment request for "${request.purpose}" status has been updated to: ${status}.`,
            isRead: false,
            link: "/my-reservations"
        });

        // If the status has been changed from 'Pending Endorsement' to 'Pending Approval', notify the endorser that they have successfully endorsed the request.
        if (oldStatus === 'Pending Endorsement' && status === 'Pending Approval' && request.endorserEmail) {
            const endorserQuery = query(usersCollection, where("email", "==", request.endorserEmail));
            const endorserSnapshot = await getDocs(endorserQuery);
            if (!endorserSnapshot.empty) {
                const endorserId = endorserSnapshot.docs[0].id;
                await NotificationService.createNotification({
                    userId: endorserId,
                    title: "Request Endorsed",
                    message: `You have successfully endorsed the equipment request for "${request.purpose}" by ${request.userName}.`,
                    isRead: false,
                    link: "/my-endorsements"
                });
            }
        } else if (request.endorserEmail) { // For other status updates, send a general notification
            const endorserQuery = query(usersCollection, where("email", "==", request.endorserEmail));
            const endorserSnapshot = await getDocs(endorserQuery);
            if (!endorserSnapshot.empty) {
                const endorserId = endorserSnapshot.docs[0].id;
                await NotificationService.createNotification({
                    userId: endorserId,
                    title: "Request Status Updated",
                    message: `The equipment request for "${request.purpose}" by ${request.userName} has been updated to: ${status}.`,
                    isRead: false,
                    link: "/my-endorsements"
                });
            }
        }
    },
    
    async updateStatusBatch(ids: string[], status: EquipmentRequestStatus, rejectionReason?: string): Promise<void> {
        const batch = writeBatch(db);
        const requestsToNotify: EquipmentRequest[] = [];

        for (const id of ids) {
            const ref = doc(db, "equipmentRequests", id);
            const reqSnap = await getDoc(ref);
            
            if (reqSnap.exists()) {
                requestsToNotify.push(reqSnap.data() as EquipmentRequest);
                const data: any = { status };
                if (status === 'Rejected' && rejectionReason) data.rejectionReason = rejectionReason;
                batch.update(ref, data);
            }
        }
        
        await batch.commit();

        // Notify Requesters and Endorsers
        for (const req of requestsToNotify) {
            // Notify Requester
             await NotificationService.createNotification({
                userId: req.userId,
                title: "Request Status Updated",
                message: `Your equipment request for "${req.purpose}" status has been updated to: ${status}.`,
                isRead: false,
                link: "/my-reservations"
            });

            // If the status has been changed from 'Pending Endorsement' to 'Pending Approval', notify the endorser that they have successfully endorsed the request.
            if (req.status === 'Pending Endorsement' && status === 'Pending Approval' && req.endorserEmail) {
                const endorserQuery = query(usersCollection, where("email", "==", req.endorserEmail));
                const endorserSnapshot = await getDocs(endorserQuery);
                if (!endorserSnapshot.empty) {
                    const endorserId = endorserSnapshot.docs[0].id;
                    await NotificationService.createNotification({
                        userId: endorserId,
                        title: "Request Endorsed",
                        message: `You have successfully endorsed the equipment request for "${req.purpose}" by ${req.userName}.`,
                        isRead: false,
                        link: "/my-endorsements"
                    });
                }
            } else if (req.endorserEmail) { // For other status updates, send a general notification
                const endorserQuery = query(usersCollection, where("email", "==", req.endorserEmail));
                const endorserSnapshot = await getDocs(endorserQuery);
                if (!endorserSnapshot.empty) {
                    const endorserId = endorserSnapshot.docs[0].id;
                    await NotificationService.createNotification({
                        userId: endorserId,
                        title: "Request Status Updated",
                        message: `The equipment request for "${req.purpose}" by ${req.userName} has been updated to: ${status}.`,
                        isRead: false,
                        link: "/my-endorsements"
                    });
                }
            }
        }
    }
}
