export interface User {
    id: string;
    googleId?: string;
    emailAddress: string;
    firstName: string;
    lastName: string;
    role: 'admin' | 'student' | 'user';
    createdAt: string;
    updatedAt: string;
}

export interface Area {
    id: string;
    name: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    areaId: string;
    isAvailable: boolean;
    instances: InventoryInstance[];
}

export interface InventoryInstance {
    id: string;
    serialNumber: string;
    status: 'available' | 'in-use' | 'maintenance';
}

export interface InventoryItemForCatalog extends Omit<InventoryItem, 'isAvailable' | 'instances'> {
    totalInstances: number;
    availableInstancesCount: number;
    availabilityStatus: 'Available' | 'Partially Available' | 'Unavailable' | 'No Instances';
}

export const AllEquipmentRequestStatuses = ['pending-signature', 'pending-endorsement', 'pending-approval', 'approved', 'rejected', 'checked-out', 'returned', 'cancelled'] as const;
export type EquipmentRequestStatus = typeof AllEquipmentRequestStatuses[number];

export interface EquipmentRequest {
    id: string;
    userId: string;
    userName: string;
    userContact: string;
    purpose: string;
    requestedStartDate: string;
    requestedEndDate: string;
    endorserName?: string;
    endorserPosition?: string;
    endorserEmail?: string;
    secondaryContactName: string;
    secondaryContactNumber: string;
    status: EquipmentRequestStatus;
    createdAt: string;
    rejectionReason?: string;
    requestedItems: {
        itemId: string;
        name: string;
        areaId: string;
        instanceId: string;
    }[];
    airSlateDocumentId?: string;
    airSlateSignedAt?: string;
}

export interface RoomType {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    areaId: string;
    capacity: number;
    instances: RoomInstance[];
}

export interface RoomInstance {
    id: string;
    name: string;
    isAvailable: boolean;
}

export interface RoomTypeForCatalog extends Omit<RoomType, 'instances'> {
    totalInstances: number;
    availableInstancesCount: number;
    availabilityStatus: 'Available' | 'Partially Available' | 'Unavailable' | 'No Instances';
}

export interface RoomTypeWithQuantity extends RoomType {
    quantity: number;
}

export const AllRoomRequestStatuses = ['pending-signature', 'pending-endorsement', 'pending-approval', 'approved', 'rejected', 'checked-in', 'no-show', 'cancelled'] as const;
export type RoomRequestStatus = typeof AllRoomRequestStatuses[number];

export interface RoomRequest {
    id: string;
    userId: string;
    userName: string;
    userContact: string;
    instanceId?: string;
    purpose: string;
    requestedStartDate: string;
    requestedEndDate: string;
    requestedStartTime: string;
    requestedEndTime: string;
    numberOfStudents: number;
    accompanyingStudents: string;
    endorserName?: string;
    endorserPosition?: string;
    endorserEmail?: string;
    status: RoomRequestStatus;
    isFlaggedNoShow: boolean;
    createdAt: string;
    rejectionReason?: string;
    requestedRoom: {
        roomTypeId: string;
        name: string;
        areaId: string;
    };
    airSlateDocumentId?: string;
    airSlateSignedAt?: string;
}


export interface Settings {
    minimumLeadDays: {
        equipment: number;
        room: number;
    }
}
