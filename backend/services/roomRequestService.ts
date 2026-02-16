
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
import { RoomRequest, RoomRequestStatus, RoomType } from '../../frontend/types';
import { NotificationService } from "./notificationService";

interface User {
    id: string;
    role: 'student' | 'admin' | 'superadmin' | 'faculty' | 'guest';
}

const roomRequestsCollection = collection(db, "roomRequests");
const usersCollection = collection(db, "users");
const roomTypesCollection = collection(db, "roomTypes");

export const RoomRequestService = {
    
    async getAll(): Promise<RoomRequest[]> {
        const q = query(roomRequestsCollection, orderBy("dateFiled", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateFiled: data.dateFiled?.toDate?.()?.toISOString() || new Date().toISOString(),
            } as RoomRequest;
        });
    },

    async getByUserId(userId: string): Promise<RoomRequest[]> {
        const q = query(roomRequestsCollection, where("userId", "==", userId), orderBy("dateFiled", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateFiled: data.dateFiled?.toDate?.()?.toISOString() || new Date().toISOString(),
            } as RoomRequest;
        });
    },

    async getByEndorserEmail(endorserEmail: string): Promise<RoomRequest[]> {
        const q = query(roomRequestsCollection, where("endorserEmail", "==", endorserEmail), orderBy("dateFiled", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                dateFiled: data.dateFiled?.toDate?.()?.toISOString() || new Date().toISOString(),
            } as RoomRequest;
        });
    },

    async create(data: Omit<RoomRequest, 'id' | 'status' | 'dateFiled'>): Promise<RoomRequest> {
        const userRef = doc(db, "users", data.userId);
        const userSnap = await getDoc(userRef);
        const requestingUser = userSnap.exists() ? (userSnap.data() as User) : null;
        
        const roomTypeRef = doc(roomTypesCollection, data.roomTypeId);
        const roomTypeSnap = await getDoc(roomTypeRef);
        if (!roomTypeSnap.exists()) {
            throw new Error("The selected room type does not exist.");
        }
        const roomType = roomTypeSnap.data() as RoomType;
        const areaId = roomType.areaId;

        let initialStatus: RoomRequestStatus;
        if (requestingUser?.role === 'student') {
            initialStatus = 'Pending Endorsement';
        } else if (requestingUser?.role === 'guest') {
            initialStatus = data.endorserEmail ? 'Pending Endorsement' : 'Pending Approval';
        } else {
            initialStatus = 'Pending Approval';
        }

        const newRequestData = {
            ...data,
            status: initialStatus,
            dateFiled: serverTimestamp(),
            areaId: areaId,
        };

        const docRef = await addDoc(roomRequestsCollection, newRequestData);
        
        const newDocSnap = await getDoc(docRef);
        const createdData = newDocSnap.data();

        if (initialStatus === 'Pending Endorsement' && data.endorserEmail) {
            const endorserQuery = query(usersCollection, where("email", "==", data.endorserEmail));
            const endorserSnapshot = await getDocs(endorserQuery);
            if (!endorserSnapshot.empty) {
                const endorserId = endorserSnapshot.docs[0].id;
                await NotificationService.createNotification({
                    userId: endorserId,
                    title: "New Endorsement Request",
                    message: `${data.userName} has requested your endorsement for a room.`,
                    isRead: false,
                    link: "/my-endorsements"
                });
            }
        }

        return {
            id: docRef.id,
            ...createdData,
            dateFiled: createdData?.dateFiled?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as RoomRequest;
    },

    async updateStatus(id: string, status: RoomRequestStatus, rejectionReason?: string): Promise<void> {
        const reqRef = doc(db, "roomRequests", id);
        
        const reqSnap = await getDoc(reqRef);
        if (!reqSnap.exists()) return;
        const request = reqSnap.data() as RoomRequest;
        const oldStatus = request.status;

        const updateData: any = { status };
        
        if (status === 'Rejected' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }
        
        await updateDoc(reqRef, updateData);

        if (status === 'Completed') {
            await NotificationService.createNotification({
                userId: request.userId,
                title: "Request Completed",
                message: `Your room request for "${request.purpose}" has been marked as completed.`,
                isRead: false,
                link: "/my-reservations"
            });
        } else {
            await NotificationService.createNotification({
                userId: request.userId,
                title: "Request Status Updated",
                message: `Your room request for "${request.purpose}" status has been updated to: ${status}.`,
                isRead: false,
                link: "/my-reservations"
            });
        }

        if (oldStatus === 'Pending Endorsement' && status === 'Pending Approval' && request.endorserEmail) {
            const endorserQuery = query(usersCollection, where("email", "==", request.endorserEmail));
            const endorserSnapshot = await getDocs(endorserQuery);
            if (!endorserSnapshot.empty) {
                const endorserId = endorserSnapshot.docs[0].id;
                await NotificationService.createNotification({
                    userId: endorserId,
                    title: "Request Endorsed",
                    message: `You have successfully endorsed the room request for "${request.purpose}" by ${request.userName}.`,
                    isRead: false,
                    link: "/my-endorsements"
                });
            }
        } else if (request.endorserEmail) {
            const endorserQuery = query(usersCollection, where("email", "==", request.endorserEmail));
            const endorserSnapshot = await getDocs(endorserQuery);
            if (!endorserSnapshot.empty) {
                const endorserId = endorserSnapshot.docs[0].id;
                await NotificationService.createNotification({
                    userId: endorserId,
                    title: "Request Status Updated",
                    message: `The room request for "${request.purpose}" by ${request.userName} has been updated to: ${status}.`,
                    isRead: false,
                    link: "/my-endorsements"
                });
            }
        }
    },

    async updateStatusBatch(ids: string[], status: RoomRequestStatus, rejectionReason?: string): Promise<void> {
        const batch = writeBatch(db);
        const requestsToNotify: RoomRequest[] = [];

        for (const id of ids) {
            const ref = doc(db, "roomRequests", id);
            const reqSnap = await getDoc(ref);
            if (reqSnap.exists()) {
                requestsToNotify.push(reqSnap.data() as RoomRequest);
                const data: any = { status };
                if (status === 'Rejected' && rejectionReason) data.rejectionReason = rejectionReason;
                batch.update(ref, data);
            }
        }

        await batch.commit();

        for (const req of requestsToNotify) {
            if (status === 'Completed') {
                await NotificationService.createNotification({
                    userId: req.userId,
                    title: "Request Completed",
                    message: `Your room request for "${req.purpose}" has been marked as completed.`,
                    isRead: false,
                    link: "/my-reservations"
                });
            } else {
                await NotificationService.createNotification({
                    userId: req.userId,
                    title: "Request Status Updated",
                    message: `Your room request for "${req.purpose}" status has been updated to: ${status}.`,
                    isRead: false,
                    link: "/my-reservations"
                });
            }

            if (req.status === 'Pending Endorsement' && status === 'Pending Approval' && req.endorserEmail) {
                const endorserQuery = query(usersCollection, where("email", "==", req.endorserEmail));
                const endorserSnapshot = await getDocs(endorserQuery);
                if (!endorserSnapshot.empty) {
                    const endorserId = endorserSnapshot.docs[0].id;
                    await NotificationService.createNotification({
                        userId: endorserId,
                        title: "Request Endorsed",
                        message: `You have successfully endorsed the room request for "${req.purpose}" by ${req.userName}.`,
                        isRead: false,
                        link: "/my-endorsements"
                    });
                }
            } else if (req.endorserEmail) {
                const endorserQuery = query(usersCollection, where("email", "==", req.endorserEmail));
                const endorserSnapshot = await getDocs(endorserQuery);
                if (!endorserSnapshot.empty) {
                    const endorserId = endorserSnapshot.docs[0].id;
                    await NotificationService.createNotification({
                        userId: endorserId,
                        title: "Request Status Updated",
                        message: `The room request for "${req.purpose}" by ${req.userName} has been updated to: ${status}.`,
                        isRead: false,
                        link: "/my-endorsements"
                    });
                }
            }
        }
    }
}
