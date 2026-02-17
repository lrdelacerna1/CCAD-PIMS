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

        const areaId = (data.requestedItems[0] as any)?.areaId || '';
        if (!areaId) {
            throw new Error("Could not determine area for this request.");
        }

        const userRole = requestingUser?.role;
        const needsEndorsement = (userRole === 'student') || (userRole === 'guest' && !!data.endorserEmail);
        const initialStatus: EquipmentRequestStatus = needsEndorsement ? 'Pending Endorsement' : 'Pending Approval';

        const newRequestData = {
            ...data,
            status: initialStatus,
            dateFiled: serverTimestamp(),
            areaId: areaId,
        };

        const docRef = await addDoc(equipmentRequestsCollection, newRequestData);
        const newDocSnap = await getDoc(docRef);
        const createdData = newDocSnap.data();

        if (initialStatus === 'Pending Endorsement' && data.endorserEmail) {
            // Notify endorser
            const endorserQuery = query(usersCollection, where("emailAddress", "==", data.endorserEmail));
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
        } else if (initialStatus === 'Pending Approval') {
            // Notify area admins + superadmins directly
            await notifyAdmins(
                areaId,
                "New Equipment Request",
                `${data.userName} has submitted an equipment request pending your approval.`
            );
        }

        return {
            id: docRef.id,
            ...createdData,
            dateFiled: createdData?.dateFiled?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as EquipmentRequest;
    },

    async updateStatus(id: string, status: EquipmentRequestStatus, rejectionReason?: string): Promise<void> {
        const reqRef = doc(db, "equipmentRequests", id);

        const reqSnap = await getDoc(reqRef);
        if (!reqSnap.exists()) return;
        const request = reqSnap.data() as EquipmentRequest;
        const oldStatus = request.status;

        const updateData: any = { status };
        if (status === 'Rejected' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }
        await updateDoc(reqRef, updateData);

        // Notify the requester
        if (status === 'Returned') {
            await NotificationService.createNotification({
                userId: request.userId,
                title: "Request Completed",
                message: `Your equipment request for "${request.purpose}" has been marked as returned.`,
                isRead: false,
                link: "/my-reservations"
            });
        } else {
            await NotificationService.createNotification({
                userId: request.userId,
                title: "Request Status Updated",
                message: `Your equipment request for "${request.purpose}" status has been updated to: ${status}.`,
                isRead: false,
                link: "/my-reservations"
            });
        }

        if (status === 'Cancelled') {
            await notifyAdmins(
                request.areaId,
                "Equipment Request Cancelled",
                `${request.userName}'s equipment request for "${request.purpose}" has been cancelled.`
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
                        message: `You have successfully endorsed the equipment request for "${request.purpose}" by ${request.userName}.`,
                        isRead: false,
                        link: "/my-endorsements"
                    });
                }
            }
            // Notify admins
            await notifyAdmins(
                request.areaId,
                "Endorsed Request Awaiting Approval",
                `${request.userName}'s equipment request has been endorsed and is now pending your approval.`
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

        for (const req of requestsToNotify) {
            // Notify requester
            if (status === 'Returned') {
                await NotificationService.createNotification({
                    userId: req.userId,
                    title: "Request Completed",
                    message: `Your equipment request for "${req.purpose}" has been marked as returned.`,
                    isRead: false,
                    link: "/my-reservations"
                });
            } else {
                await NotificationService.createNotification({
                    userId: req.userId,
                    title: "Request Status Updated",
                    message: `Your equipment request for "${req.purpose}" status has been updated to: ${status}.`,
                    isRead: false,
                    link: "/my-reservations"
                });
            }

            if (status === 'Cancelled') {
                await notifyAdmins(
                    req.areaId,
                    "Equipment Request Cancelled",
                    `${req.userName}'s equipment request for "${req.purpose}" has been cancelled.`
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
                            message: `You have successfully endorsed the equipment request for "${req.purpose}" by ${req.userName}.`,
                            isRead: false,
                            link: "/my-endorsements"
                        });
                    }
                }
                await notifyAdmins(
                    req.areaId,
                    "Endorsed Request Awaiting Approval",
                    `${req.userName}'s equipment request has been endorsed and is now pending your approval.`
                );
            } else if (req.endorserEmail) {
                const endorserQuery = query(usersCollection, where("emailAddress", "==", req.endorserEmail));
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