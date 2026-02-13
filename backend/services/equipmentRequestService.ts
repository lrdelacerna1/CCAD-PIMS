
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

// IMPORTANT: Define User interface locally or import from a shared types file if not available
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
                // Handle date conversion if needed, assuming stored as Timestamp
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

    // Fix: Method signature match
    async create(data: Omit<EquipmentRequest, 'id' | 'status' | 'dateFiled'>): Promise<EquipmentRequest> {
        const userRef = doc(db, "users", data.userId);
        const userSnap = await getDoc(userRef);
        const requestingUser = userSnap.exists() ? (userSnap.data() as User) : null;
        
        // Fix: Role consistency check. 'areaManager' was used in previous code but not in UserRole type.
        // Assuming 'admin' or 'superadmin' are the elevated roles.
        const isAdminRequest = requestingUser && (requestingUser.role === 'admin' || requestingUser.role === 'superadmin');

        // Fix: Initial status logic.
        // If admin/superadmin, might skip endorsement? Or just 'Pending Approval'?
        // The standard flow usually starts at 'Pending Endorsement' unless elevated.
        const initialStatus: EquipmentRequestStatus = isAdminRequest ? 'Pending Approval' : 'Pending Endorsement';

        const newRequestData = {
            ...data,
            status: initialStatus,
            dateFiled: serverTimestamp(),
            // Remove AirSlate specific logic if not fully implemented or mock it properly
        };

        const docRef = await addDoc(equipmentRequestsCollection, newRequestData);
        
        // Fetch again to get the server timestamp
        const newDocSnap = await getDoc(docRef);
        const createdData = newDocSnap.data();

        return {
            id: docRef.id,
            ...createdData,
            dateFiled: createdData?.dateFiled?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as EquipmentRequest;
    },

    async updateStatus(id: string, status: EquipmentRequestStatus, rejectionReason?: string): Promise<void> {
        const reqRef = doc(db, "equipmentRequests", id);
        const updateData: any = { status };
        
        if (status === 'Rejected' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }
        
        await updateDoc(reqRef, updateData);
        
        // Fix: Notification logic should likely be here or called here
        // For now, keeping it simple as per request to fix process
    },
    
    // Fix: Added batch update support if needed, or keeping it singular for simplicity in fixes
    async updateStatusBatch(ids: string[], status: EquipmentRequestStatus, rejectionReason?: string): Promise<void> {
        const batch = writeBatch(db);
        ids.forEach(id => {
            const ref = doc(db, "equipmentRequests", id);
            const data: any = { status };
            if (status === 'Rejected' && rejectionReason) data.rejectionReason = rejectionReason;
            batch.update(ref, data);
        });
        await batch.commit();
    }
}
