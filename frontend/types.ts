
// Main data types used throughout the frontend application

export type UserRole = 'student' | 'admin' | 'superadmin' | 'faculty' | 'guest';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    photoURL?: string;
    // Optional fields based on your user schema
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
    emailVerified?: boolean;
}

export interface Area {
    id: string;
    name: string;
    description: string;
}

// --- INVENTORY & EQUIPMENT --- //

export type InventoryInstanceStatus = 'Available' | 'Reserved' | 'Under Maintenance';
export type InventoryInstanceCondition = 'Good' | 'Damaged' | 'Lost/Unusable';

export interface InventoryItem {
    id: string;
    name: string;
    areaId: string;
    description?: string;
    photoUrl?: string;
    isHidden?: boolean;
}

export interface InventoryItemWithQuantity extends InventoryItem {
    quantity: {
        total: number;
        available: number;
        reserved: number;
        underMaintenance: number;
    };
}

export interface InventoryInstance {
    id: string;
    itemId: string;
    serialNumber: string;
    status: InventoryInstanceStatus;
    condition: InventoryInstanceCondition;
    notes?: string;
    assetTag?: string;
    purchaseDate?: string;
    warrantyEndDate?: string;
    lastMaintenanceDate?: string;
    photoUrls?: string[];
    blockedDates?: string[];
}


// --- ROOMS --- //

export type RoomStatus = 'Available' | 'Reserved' | 'Under Maintenance';
export type RoomCondition = 'Newly Renovated' | 'Good' | 'Fair' | 'Poor';

export interface RoomType {
    id: string;
    name: string;
    areaId: string;
    description?: string;
    photoUrl?: string;
    isHidden?: boolean;
}

export interface RoomTypeWithQuantity extends RoomType {
    quantity: {
        total: number;
        available: number;
        reserved: number;
        underMaintenance: number;
    };
}

export interface RoomInstance {
    id: string;
    roomTypeId: string;
    name: string;
    status: RoomStatus;
    condition: RoomCondition;
    capacity?: number;
    notes?: string;
    features?: string[];
    photoUrls?: string[];
    blockedDates?: string[];
}


// --- REQUESTS & RESERVATIONS --- //

export const AllEquipmentRequestStatuses = ['Pending Endorsement', 'Pending Approval', 'Approved', 'Rejected', 'Ready for Pickup', 'In Use', 'Returned', 'Overdue', 'Cancelled'] as const;
export type EquipmentRequestStatus = typeof AllEquipmentRequestStatuses[number];

export interface EquipmentRequest {
    id: string;
    userId: string;
    userName: string;
    userContact: string;
    purpose: string;
    status: EquipmentRequestStatus;
    endorserName?: string;
    endorserPosition?: string;
    endorserEmail?: string;
    requestedStartDate: string;
    requestedEndDate: string;
    secondaryContactName?: string;
    secondaryContactNumber?: string;
    requestedItems: {
        itemId: string;
        name: string;
        quantity: number;
    }[];
    assignedItems?: {
        itemId: string;
        instanceId: string;
    }[];
    approvedBy?: string;
    rejectionReason?: string;
    cancellationReason?: string;
    dateFiled: string; // ISO string
}

export const AllRoomRequestStatuses = ['Pending Endorsement', 'Pending Approval', 'Approved', 'Rejected', 'Ready for Check-in', 'In Use', 'Completed', 'Overdue', 'Cancelled'] as const;
export type RoomRequestStatus = typeof AllRoomRequestStatuses[number];

export interface RoomRequest {
    id: string;
    userId: string;
    userName: string;
    userContact: string;
    purpose: string;
    status: RoomRequestStatus;
    endorserName?: string;
    endorserPosition?: string;
    endorserEmail?: string;
    requestedStartDate: string;
    requestedEndDate: string;
    roomTypeId: string;
    instanceId?: string;
    approvedBy?: string;
    rejectionReason?: string;
    cancellationReason?: string;
    dateFiled: string; // ISO string
}

export interface Reservation {
    id: string;
    type: 'equipment' | 'room';
    request: EquipmentRequest | RoomRequest;
}

export interface AvailabilityResult {
    itemId: string;
    total: number;
    available: number;
    unavailableInstances: { id: string; serialNumber: string; status: InventoryInstanceStatus }[];
}

export interface RoomAvailabilityRequest {
    startDate: string;
    endDate: string;
    roomTypeIds: string[];
}

export interface RoomInstanceAvailabilityResult {
    roomTypeId: string;
    totalInstances: number;
    availableInstances: { id: string, name: string, condition: RoomCondition }[];
    unavailableInstances: { id: string, name: string, status: RoomStatus }[];
}


// --- OTHER --- //

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string; // ISO string
    link?: string; // Optional link to navigate to
}

export interface Penalty {
  id: string;
  userId: string;
  userName: string;
  requestType: 'equipment' | 'room';
  requestId: string;
  reason: 'Late Return' | 'Damaged Equipment' | 'Room No-Show' | 'Other';
  details: string; 
  amount: number;
  isPaid: boolean;
  createdAt: string; // ISO string
}
