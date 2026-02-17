
// Main data types used throughout the frontend application

export type UserRole = 'student' | 'faculty' | 'guest' | 'admin' | 'superadmin' | 'pending-faculty';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    photoURL?: string;
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
    emailVerified?: boolean;
    managedAreaIds?: string[];
    createdAt?: string;   // ISO string
    lastLogin?: string;   // ISO string
    contactNumber?: string;   // ← add this
    idNumber?: string;        // ← add this
}

export interface Area {
    id: string;
    name: string;
    description: string;
    penaltyAmount: number;
    adminIds?: string[];      // ADD THIS
    facultyIds?: string[];    // ADD THIS
    penaltySettings?: {
        penaltyAmount: number;
        penaltyInterval: 'per_day' | 'per_hour';
    };
}

// --- INVENTORY & EQUIPMENT --- //

export type InventoryInstanceStatus = 'Available' | 'Reserved' | 'Under Maintenance';
export type InventoryInstanceCondition = 'Good' | 'Damaged' | 'Lost/Unusable';

export type AvailabilityStatus =
    | 'Available'
    | 'Unavailable'
    | 'Unavailable: On Hold'
    | 'Unavailable: Reserved'
    | 'Unavailable: Under Maintenance'
    | 'Unavailable: No Instances';

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
    serialNumber?: string;
    status: InventoryInstanceStatus;
    condition: InventoryInstanceCondition;
    notes?: string;
    assetTag: string;
    purchaseDate?: string;
    warrantyEndDate?: string;
    lastMaintenanceDate?: string;
    photoUrls?: string[];
    blockedDates?: string[];
}

export interface InventoryItemForCatalog extends InventoryItemWithQuantity {
    availabilityStatus: AvailabilityStatus;
    availableForDates: number;
    conditionSummary?: Partial<Record<InventoryInstanceCondition, number>>;
}

// --- ROOMS --- //

export type RoomStatus = 'Available' | 'Reserved' | 'Under Maintenance';
export type RoomCondition = 'Good' | 'Requires Maintenance' | 'Out of Service';

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

export interface RoomTypeForCatalog extends RoomTypeWithQuantity {
    availabilityStatus: AvailabilityStatus;
    availableForDates: number;
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
    areaId: string;
    returnDate?: string;
    equipmentName?: string;
    requestedStartTime?: string;  // ← add this
    requestedEndTime?: string;    // ← add this
    isWholeDay?: boolean;         // ← add this
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
    areaId: string;
    returnDate?: string;
    roomName?: string;
    requestedStartTime?: string;  // e.g. '08:00'
    requestedEndTime?: string;    // e.g. '17:00'
    isWholeDay?: boolean;
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
    unavailableInstances: { id: string; assetTag: string; status: InventoryInstanceStatus }[];
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
    createdAt: string;
    link?: string;
}

export interface Penalty {
    id: string;
    userId: string;
    reason: string;
    amount: number;
    isPaid: boolean;
    requestId: string;
    requestType: 'equipment' | 'room';
    createdAt: string;
}

export interface ReservationSettings {
    minimumLeadDays: number;
    // Add other settings fields here as needed
}