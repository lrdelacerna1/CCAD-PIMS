
import { 
    doc, 
    getDoc, 
    setDoc, 
    addDoc,
    updateDoc, 
    deleteDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    DocumentReference, 
    Timestamp 
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { User, StudentProfile, GuestProfile, Area, Room, Equipment, RoomRequest, EquipmentRequest, Penalty } from "../types/firestore";

//================================================================================
// Helper Functions
//================================================================================

/**
 * Converts a Firestore document reference to a serializable object for client-side use.
 */
const refToPath = (ref: DocumentReference) => ({ path: ref.path });

/**
 * Converts a path object back to a Firestore document reference.
 */
const pathToRef = (path: { path: string }) => doc(db, path.path);

/**
 * Prepares an object for saving to Firestore by converting path objects back to references.
 */
const prepareForFirestore = (data: any): any => {
    if (data && typeof data === 'object') {
        if (data.hasOwnProperty('path') && Object.keys(data).length === 1) {
            return pathToRef(data);
        }
        if (Array.isArray(data)) {
            return data.map(item => prepareForFirestore(item));
        }
        const newData: { [key: string]: any } = {};
        for (const key in data) {
            newData[key] = prepareForFirestore(data[key]);
        }
        return newData;
    }
    return data;
};

/**
 * Prepares a document snapshot for client-side use by converting references and timestamps.
 */
const prepareForClient = (doc: any): any => {
    if (!doc) return null;
    const data = doc.data();
    if (!data) return { id: doc.id };

    const clientData: { [key: string]: any } = { id: doc.id };
    for (const key in data) {
        const value = data[key];
        if (value instanceof DocumentReference) {
            clientData[key] = refToPath(value);
        } else if (value instanceof Timestamp) {
            clientData[key] = value.toDate().toISOString();
        } else if (Array.isArray(value)) {
            clientData[key] = value.map(item => prepareForClient({ data: () => item }));
        } else if (value && typeof value === 'object') {
            clientData[key] = prepareForClient({ data: () => value });
        } else {
            clientData[key] = value;
        }
    }
    return clientData;
};


//================================================================================
// User Service
//================================================================================

const usersCollection = collection(db, "users");

export const userService = {
    /**
     * Creates or updates a user in the `users` collection.
     * @param userId - The ID of the user.
     * @param userData - The user data to save.
     */
    async setUser(userId: string, userData: Partial<User>): Promise<void> {
        const userRef = doc(usersCollection, userId);
        await setDoc(userRef, prepareForFirestore(userData), { merge: true });
    },

    /**
     * Retrieves a user from the `users` collection.
     * @param userId - The ID of the user to retrieve.
     * @returns The user data, or null if not found.
     */
    async getUser(userId: string): Promise<User | null> {
        const userRef = doc(usersCollection, userId);
        const userSnap = await getDoc(userRef);
        return userSnap.exists() ? prepareForClient(userSnap) as User : null;
    },

    /**
     * Retrieves a user by their email address.
     * @param email - The email of the user to retrieve.
     * @returns The user data, or null if not found.
     */
    async getUserByEmail(email: string): Promise<User | null> {
        const q = query(usersCollection, where("emailAddress", "==", email));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        return prepareForClient(querySnapshot.docs[0]) as User;
    },

    /**
     * Deletes a user from the `users` collection.
     * @param userId - The ID of the user to delete.
     */
    async deleteUser(userId: string): Promise<void> {
        const userRef = doc(usersCollection, userId);
        await deleteDoc(userRef);
    },

    /**
     * Sets the student profile for a user.
     * @param userId - The ID of the user.
     * @param profileData - The student profile data.
     */
    async setStudentProfile(userId: string, profileData: StudentProfile): Promise<void> {
        const profileRef = doc(usersCollection, userId, "studentProfile", "profile");
        await setDoc(profileRef, profileData);
    },

    /**
     * Retrieves the student profile for a user.
     * @param userId - The ID of the user.
     * @returns The student profile data, or null if not found.
     */
    async getStudentProfile(userId: string): Promise<StudentProfile | null> {
        const profileRef = doc(usersCollection, userId, "studentProfile", "profile");
        const profileSnap = await getDoc(profileRef);
        return profileSnap.exists() ? profileSnap.data() as StudentProfile : null;
    },

    /**
     * Sets the guest profile for a user.
     * @param userId - The ID of the user.
     * @param profileData - The guest profile data.
     */
    async setGuestProfile(userId: string, profileData: GuestProfile): Promise<void> {
        const profileRef = doc(usersCollection, userId, "guestProfile", "profile");
        await setDoc(profileRef, profileData);
    },

    /**
     * Retrieves the guest profile for a user.
     * @param userId - The ID of the user.
     * @returns The guest profile data, or null if not found.
     */
    async getGuestProfile(userId: string): Promise<GuestProfile | null> {
        const profileRef = doc(usersCollection, userId, "guestProfile", "profile");
        const profileSnap = await getDoc(profileRef);
        return profileSnap.exists() ? profileSnap.data() as GuestProfile : null;
    }
};

//================================================================================
// Area Service
//================================================================================

const areasCollection = collection(db, "areas");

export const areaService = {
    /**
     * Creates a new area.
     * @param areaData - The data for the new area.
     * @returns The ID of the newly created area.
     */
    async createArea(areaData: Omit<Area, 'id'>): Promise<string> {
        const docRef = await addDoc(areasCollection, prepareForFirestore(areaData));
        return docRef.id;
    },

    /**
     * Retrieves an area.
     * @param areaId - The ID of the area to retrieve.
     * @returns The area data, or null if not found.
     */
    async getArea(areaId: string): Promise<Area | null> {
        const docRef = doc(areasCollection, areaId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? prepareForClient(docSnap) as Area : null;
    },

    /**
     * Retrieves all areas.
     * @returns An array of all areas.
     */
    async getAllAreas(): Promise<Area[]> {
        const snapshot = await getDocs(areasCollection);
        return snapshot.docs.map(doc => prepareForClient(doc) as Area);
    },
    
    /**
     * Updates an existing area.
     * @param areaId - The ID of the area to update.
     * @param updates - An object with the fields to update.
     */
    async updateArea(areaId: string, updates: Partial<Area>): Promise<void> {
        const docRef = doc(areasCollection, areaId);
        await updateDoc(docRef, prepareForFirestore(updates));
    },

    /**
     * Deletes an area.
     * @param areaId - The ID of the area to delete.
     */
    async deleteArea(areaId: string): Promise<void> {
        const docRef = doc(areasCollection, areaId);
        await deleteDoc(docRef);
    }
};

//================================================================================
// Room Service
//================================================================================

const roomsCollection = collection(db, "rooms");

export const roomService = {
    /**
     * Creates a new room.
     * @param roomData - The data for the new room.
     * @returns The ID of the newly created room.
     */
    async createRoom(roomData: Omit<Room, 'id'>): Promise<string> {
        const docRef = await addDoc(roomsCollection, prepareForFirestore(roomData));
        return docRef.id;
    },

    /**
     * Retrieves a room.
     * @param roomId - The ID of the room to retrieve.
     * @returns The room data, or null if not found.
     */
    async getRoom(roomId: string): Promise<Room | null> {
        const docRef = doc(roomsCollection, roomId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? prepareForClient(docSnap) as Room : null;
    },

    /**
     * Retrieves all rooms.
     * @returns An array of all rooms.
     */
    async getAllRooms(): Promise<Room[]> {
        const snapshot = await getDocs(roomsCollection);
        return snapshot.docs.map(doc => prepareForClient(doc) as Room);
    },
    
    /**
     * Updates an existing room.
     * @param roomId - The ID of the room to update.
     * @param updates - An object with the fields to update.
     */
    async updateRoom(roomId: string, updates: Partial<Room>): Promise<void> {
        const docRef = doc(roomsCollection, roomId);
        await updateDoc(docRef, prepareForFirestore(updates));
    },

    /**
     * Deletes a room.
     * @param roomId - The ID of the room to delete.
     */
    async deleteRoom(roomId: string): Promise<void> {
        const docRef = doc(roomsCollection, roomId);
        await deleteDoc(docRef);
    },

    /**
     * Filters rooms by area.
     * @param areaId - The ID of the area to filter by.
     * @returns An array of rooms in the specified area.
     */
    async getRoomsByArea(areaId: string): Promise<Room[]> {
        const areaRef = doc(db, `areas/${areaId}`);
        const q = query(roomsCollection, where("areaId", "==", areaRef));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => prepareForClient(doc) as Room);
    }
};


//================================================================================
// Equipment Service
//================================================================================

const equipmentCollection = collection(db, "equipment");

export const equipmentService = {
    /**
     * Creates a new equipment item.
     * @param equipmentData - The data for the new equipment item.
     * @returns The ID of the newly created equipment item.
     */
    async createEquipment(equipmentData: Omit<Equipment, 'id'>): Promise<string> {
        const docRef = await addDoc(equipmentCollection, prepareForFirestore(equipmentData));
        return docRef.id;
    },

    /**
     * Retrieves an equipment item.
     * @param equipmentId - The ID of the equipment item to retrieve.
     * @returns The equipment item data, or null if not found.
     */
    async getEquipment(equipmentId: string): Promise<Equipment | null> {
        const docRef = doc(equipmentCollection, equipmentId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? prepareForClient(docSnap) as Equipment : null;
    },

    /**
     * Retrieves all equipment items.
     * @returns An array of all equipment items.
     */
    async getAllEquipment(): Promise<Equipment[]> {
        const snapshot = await getDocs(equipmentCollection);
        return snapshot.docs.map(doc => prepareForClient(doc) as Equipment);
    },
    
    /**
     * Updates an existing equipment item.
     * @param equipmentId - The ID of the equipment item to update.
     * @param updates - An object with the fields to update.
     */
    async updateEquipment(equipmentId: string, updates: Partial<Equipment>): Promise<void> {
        const docRef = doc(equipmentCollection, equipmentId);
        await updateDoc(docRef, prepareForFirestore(updates));
    },

    /**
     * Deletes an equipment item.
     * @param equipmentId - The ID of the equipment item to delete.
     */
    async deleteEquipment(equipmentId: string): Promise<void> {
        const docRef = doc(equipmentCollection, equipmentId);
        await deleteDoc(docRef);
    },

    /**
     * Searches for equipment by type.
     * @param type - The type of equipment to search for.
     * @returns An array of equipment items of the specified type.
     */
    async searchEquipmentByType(type: string): Promise<Equipment[]> {
        const q = query(equipmentCollection, where("type", "==", type));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => prepareForClient(doc) as Equipment);
    }
};

//================================================================================
// Room Request Service
//================================================================================

const roomRequestsCollection = collection(db, "roomRequests");

export const roomRequestService = {
    /**
     * Creates a new room request.
     * @param requestData - The data for the new room request.
     * @returns The ID of the newly created room request.
     */
    async createRoomRequest(requestData: Omit<RoomRequest, 'id'>): Promise<string> {
        const docRef = await addDoc(roomRequestsCollection, prepareForFirestore(requestData));
        return docRef.id;
    },

    /**
     * Retrieves a room request.
     * @param requestId - The ID of the room request to retrieve.
     * @returns The room request data, or null if not found.
     */
    async getRoomRequest(requestId: string): Promise<RoomRequest | null> {
        const docRef = doc(roomRequestsCollection, requestId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? prepareForClient(docSnap) as RoomRequest : null;
    },

    /**
     * Updates an existing room request.
     * @param requestId - The ID of the room request to update.
     * @param updates - An object with the fields to update.
     */
    async updateRoomRequest(requestId: string, updates: Partial<RoomRequest>): Promise<void> {
        const docRef = doc(roomRequestsCollection, requestId);
        await updateDoc(docRef, prepareForFirestore(updates));
    },

    /**
     * Deletes a room request.
     * @param requestId - The ID of the room request to delete.
     */
    async deleteRoomRequest(requestId: string): Promise<void> {
        const docRef = doc(roomRequestsCollection, requestId);
        await deleteDoc(docRef);
    },

    /**
     * Retrieves all room requests for a specific user.
     * @param userId - The ID of the user.
     * @returns An array of room requests.
     */
    async getRoomRequestsByUser(userId: string): Promise<RoomRequest[]> {
        const userRef = doc(db, `users/${userId}`);
        const q = query(roomRequestsCollection, where("userId", "==", userRef));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => prepareForClient(doc) as RoomRequest);
    },

    /**
     * Retrieves room requests by their status.
     * @param status - The status to filter by.
     * @returns An array of room requests with the specified status.
     */
    async getRoomRequestsByStatus(status: RoomRequest['status']): Promise<RoomRequest[]> {
        const q = query(roomRequestsCollection, where("status", "==", status));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => prepareForClient(doc) as RoomRequest);
    }
};

//================================================================================
// Equipment Request Service
//================================================================================

const equipmentRequestsCollection = collection(db, "equipmentRequests");

export const equipmentRequestService = {
    /**
     * Creates a new equipment request.
     * @param requestData - The data for the new equipment request.
     * @returns The ID of the newly created equipment request.
     */
    async createEquipmentRequest(requestData: Omit<EquipmentRequest, 'id'>): Promise<string> {
        const docRef = await addDoc(equipmentRequestsCollection, prepareForFirestore(requestData));
        return docRef.id;
    },

    /**
     * Retrieves an equipment request.
     * @param requestId - The ID of the equipment request to retrieve.
     * @returns The equipment request data, or null if not found.
     */
    async getEquipmentRequest(requestId: string): Promise<EquipmentRequest | null> {
        const docRef = doc(equipmentRequestsCollection, requestId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? prepareForClient(docSnap) as EquipmentRequest : null;
    },

    /**
     * Updates an existing equipment request.
     * @param requestId - The ID of the equipment request to update.
     * @param updates - An object with the fields to update.
     */
    async updateEquipmentRequest(requestId: string, updates: Partial<EquipmentRequest>): Promise<void> {
        const docRef = doc(equipmentRequestsCollection, requestId);
        await updateDoc(docRef, prepareForFirestore(updates));
    },

    /**
     * Deletes an equipment request.
     * @param requestId - The ID of the equipment request to delete.
     */
    async deleteEquipmentRequest(requestId: string): Promise<void> {
        const docRef = doc(equipmentRequestsCollection, requestId);
        await deleteDoc(docRef);
    },

    /**
     * Retrieves all equipment requests for a specific user.
     * @param userId - The ID of the user.
     * @returns An array of equipment requests.
     */
    async getEquipmentRequestsByUser(userId: string): Promise<EquipmentRequest[]> {
        const userRef = doc(db, `users/${userId}`);
        const q = query(equipmentRequestsCollection, where("userId", "==", userRef));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => prepareForClient(doc) as EquipmentRequest);
    },

    /**
     * Retrieves equipment requests by their status.
     * @param status - The status to filter by.
     * @returns An array of equipment requests with the specified status.
     */
    async getEquipmentRequestsByStatus(status: EquipmentRequest['status']): Promise<EquipmentRequest[]> {
        const q = query(equipmentRequestsCollection, where("status", "==", status));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => prepareForClient(doc) as EquipmentRequest);
    }
};

//================================================================================
// Penalty Service
//================================================================================

const penaltiesCollection = collection(db, "penalties");

export const penaltyService = {
    /**
     * Creates a new penalty.
     * @param penaltyData - The data for the new penalty.
     * @returns The ID of the newly created penalty.
     */
    async createPenalty(penaltyData: Omit<Penalty, 'id'>): Promise<string> {
        const docRef = await addDoc(penaltiesCollection, prepareForFirestore(penaltyData));
        return docRef.id;
    },

    /**
     * Retrieves a penalty.
     * @param penaltyId - The ID of the penalty to retrieve.
     * @returns The penalty data, or null if not found.
     */
    async getPenalty(penaltyId: string): Promise<Penalty | null> {
        const docRef = doc(penaltiesCollection, penaltyId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? prepareForClient(docSnap) as Penalty : null;
    },

    /**
     * Updates an existing penalty.
     * @param penaltyId - The ID of the penalty to update.
     * @param updates - An object with the fields to update.
     */
    async updatePenalty(penaltyId: string, updates: Partial<Penalty>): Promise<void> {
        const docRef = doc(penaltiesCollection, penaltyId);
        await updateDoc(docRef, prepareForFirestore(updates));
    },

    /**
     * Retrieves all penalties for a specific user.
     * @param userId - The ID of the user.
     * @returns An array of penalties.
     */
    async getPenaltiesByUser(userId: string): Promise<Penalty[]> {
        const userRef = doc(db, `users/${userId}`);
        const q = query(penaltiesCollection, where("userId", "==", userRef));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => prepareForClient(doc) as Penalty);
    }
};