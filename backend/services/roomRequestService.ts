
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

// IMPORTANT: Define User interface locally or import from a shared types file if not available
interface User {
    id: string;
    role: 'student' | 'admin' | 'superadmin' | 'faculty' | 'guest';
}

const roomRequestsCollection = collection(db, "roomRequests");
const usersCollection = collection(db, "users");

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
        
        // Fix: Consistency with EquipmentRequestService
        const isAdminRequest = requestingUser && (requestingUser.role === 'admin' || requestingUser.role === 'superadmin');
        const initialStatus: RoomRequestStatus = isAdminRequest ? 'Pending Approval' : 'Pending Endorsement';

        const newRequestData = {
            ...data,
            status: initialStatus,
            dateFiled: serverTimestamp(),
        };

        const docRef = await addDoc(roomRequestsCollection, newRequestData);
        
        const newDocSnap = await getDoc(docRef);
        const createdData = newDocSnap.data();

        return {
            id: docRef.id,
            ...createdData,
            dateFiled: createdData?.dateFiled?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as RoomRequest;
    },

    async updateStatus(id: string, status: RoomRequestStatus, rejectionReason?: string): Promise<void> {
        const reqRef = doc(db, "roomRequests", id);
        const updateData: any = { status };
        
        if (status === 'Rejected' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }
        
        await updateDoc(reqRef, updateData);
    },

    async updateStatusBatch(ids: string[], status: RoomRequestStatus, rejectionReason?: string): Promise<void> {
        const batch = writeBatch(db);
        ids.forEach(id => {
            const ref = doc(db, "roomRequests", id);
            const data: any = { status };
            if (status === 'Rejected' && rejectionReason) data.rejectionReason = rejectionReason;
            batch.update(ref, data);
        });
        await batch.commit();
    }
}
