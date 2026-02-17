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
import { RoomRequest, RoomRequestStatus } from '../../frontend/types';
import { NotificationService } from "./notificationService";

interface User {
    id: string;
    role: 'student' | 'admin' | 'superadmin' | 'faculty' | 'guest';
}

const roomRequestsCollection = collection(db, "roomRequests");
const usersCollection = collection(db, "users");

// Helper: notify all area admins + superadmins
async function notifyAdmins(areaId: string, title: string, message: string) {
    const areaRef = doc(db, "areas", areaId);
    const areaSnap = await getDoc(areaRef);
    const areaAdminIds: string[] = areaSnap.exists() ? (areaSnap.data()?.adminIds || []) : [];

    const superAdminSnap = await getDocs(query(usersCollection, where("role", "==", "superadmin")));
    const superAdminIds = superAdminSnap.docs.map(d => d.id);

    const allAdminIds = [...new Set([...areaAdminIds, ...superAdminIds])];

    await Promise.all(allAdminIds.map(adminId =>
        NotificationService.createNotification({
            userId: adminId,
            title,
            message,
            isRead: false,
            link: "/all-requests"
        })
    ));
}

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

        const requestedRooms = (data as any).requestedRoom as { roomTypeId: string; areaId: string; instanceId: string; name: string }[];
        if (!requestedRooms || requestedRooms.length === 0) {
            throw new Error("No rooms specified in the request.");
        }

        const areaId = requestedRooms[0].areaId;
        if (!areaId) {
            throw new Error("Could not determine area for this request.");
        }

        const userRole = requestingUser?.role;
        const needsEndorsement = (userRole === 'student') || (userRole === 'guest' && !!(data as any).endorserEmail);
        const initialStatus: RoomRequestStatus = needsEndorsement ? 'Pending Endorsement' : 'Pending Approval';

        const newRequestData = {
            ...data,
            status: initialStatus,
            dateFiled: serverTimestamp(),
            areaId: areaId,
        };

        const docRef = await addDoc(roomRequestsCollection, newRequestData);
        const newDocSnap = await getDoc(docRef);
        const createdData = newDocSnap.data();

        if (initialStatus === 'Pending Endorsement' && (data as any).endorserEmail) {
            // Notify endorser
            const endorserQuery = query(usersCollection, where("emailAddress", "==", (data as any).endorserEmail));
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
        } else if (initialStatus === 'Pending Approval') {
            // Notify area admins + superadmins directly
            await notifyAdmins(
                areaId,
                "New Room Request",
                `${data.userName} has submitted a room request pending your approval.`
            );
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

        // Notify the requester
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

        // Notify admins when a room request is cancelled
        if (status === 'Cancelled') {
            await notifyAdmins(
                request.areaId,
                "Room Request Cancelled",
                `${request.userName}'s room request for "${request.purpose}" has been cancelled.`
            );
        }

        // Endorsement flow → now pending admin approval
        if (oldStatus === 'Pending Endorsement' && status === 'Pending Approval') {
            if (request.endorserEmail) {
                const endorserQuery = query(usersCollection, where("emailAddress", "==", request.endorserEmail));
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
            }
            // Notify admins that endorsed request needs their approval
            await notifyAdmins(
                request.areaId,
                "Endorsed Request Awaiting Approval",
                `${request.userName}'s room request has been endorsed and is now pending your approval.`
            );
        } else if (request.endorserEmail) {
            // Notify endorser of other status updates
            const endorserQuery = query(usersCollection, where("emailAddress", "==", request.endorserEmail));
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
            // Notify requester
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

            // Notify admins when a room request is cancelled
            if (status === 'Cancelled') {
                await notifyAdmins(
                    req.areaId,
                    "Room Request Cancelled",
                    `${req.userName}'s room request for "${req.purpose}" has been cancelled.`
                );
            }

            if (req.status === 'Pending Endorsement' && status === 'Pending Approval') {
                if (req.endorserEmail) {
                    const endorserQuery = query(usersCollection, where("emailAddress", "==", req.endorserEmail));
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
                }
                await notifyAdmins(
                    req.areaId,
                    "Endorsed Request Awaiting Approval",
                    `${req.userName}'s room request has been endorsed and is now pending your approval.`
                );
            } else if (req.endorserEmail) {
                const endorserQuery = query(usersCollection, where("emailAddress", "==", req.endorserEmail));
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