
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
        
        const isStudent = requestingUser && requestingUser.role === 'student';
        const initialStatus: EquipmentRequestStatus = isStudent ? 'Pending Endorsement' : 'Pending Approval';

        const newRequestData = {
            ...data,
            status: initialStatus,
            dateFiled: serverTimestamp(),
        };

        const docRef = await addDoc(equipmentRequestsCollection, newRequestData);
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
    },
    
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
