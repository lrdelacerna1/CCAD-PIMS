
// Main data types used throughout the frontend application

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'student' | 'admin' | 'superadmin' | 'faculty';
    photoURL?: string;
    // Optional fields based on your user schema
    firstName?: string;
    lastName?: string;
    emailAddress?: string;
}

export interface Area {
    id: string;
    name: string;
    description: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    areaId: string;
    imageUrl?: string;
    isReservable: boolean;
    // This will be populated by instance data
    totalStock: number; 
    instances: InventoryInstance[];
}

export interface InventoryInstance {
    id: string;
    itemId: string;
    serialNumber: string;
    status: 'available' | 'in-use' | 'under-maintenance';
    condition: 'new' | 'good' | 'fair' | 'poor';
}

export interface RoomType {
    id: string;
    name: string;
    description: string;
    areaId: string;
    capacity: number;
    imageUrl?: string;
    isReservable: boolean;
    instances: RoomInstance[];
}

export interface RoomInstance {
    id: string;
    roomTypeId: string;
    name: string; // e.g., "Room 101", "Mac Lab A"
    status: 'available' | 'occupied' | 'under-maintenance';
}

// For displaying in catalog with availability info
export interface InventoryItemForCatalog extends InventoryItem {
    availabilityStatus: 'Available' | 'Unavailable' | 'Partially Available';
    availableCount: number;
}
export interface RoomTypeForCatalog extends RoomType {
    availabilityStatus: 'Available' | 'Unavailable';
    availableInstancesCount: number;
}

export const AllEquipmentRequestStatuses = ['pending-endorsement', 'pending-approval', 'approved', 'rejected', 'in-use', 'completed', 'cancelled'] as const;
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
    
    secondaryContactName: string;
    secondaryContactNumber: string;

    requestedItems: {
        itemId: string;
        name: string;
        areaId: string;
        instanceId: string;
    }[];

    assignedItems?: {
        [itemId: string]: string; // Maps item ID to an instance ID
    };

    approvedBy?: string; // Admin User ID
    rejectionReason?: string;
    cancellationReason?: string;

    createdAt: string; // ISO string
    approvedAt?: string;
    rejectedAt?: string;
    endorsedAt?: string;
    collectedAt?: string; // When items were picked up
    returnedAt?: string; // When items were returned
}

export const AllRoomRequestStatuses = ['pending-endorsement', 'pending-approval', 'approved', 'rejected', 'active', 'completed', 'cancelled', 'no-show'] as const;
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
    requestedStartTime: string;
    requestedEndTime: string;
    
    numberOfStudents: number;
    accompanyingStudents: string;
    
    requestedRoom: {
        roomTypeId: string;
        name: string;
        areaId: string;
    };
    instanceId?: string; // Assigned Room Instance ID

    isFlaggedNoShow: boolean;
    
    approvedBy?: string; // Admin User ID
    rejectionReason?: string;
    cancellationReason?: string;

    createdAt: string; // ISO string
    approvedAt?: string;
    rejectedAt?: string;
    endorsedAt?: string;
}

export interface Reservation {
    id: string;
    type: 'equipment' | 'room';
    request: EquipmentRequest | RoomRequest;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: string; // ISO String
    end: string; // ISO String
    allDay: boolean;
    resourceId?: string; // Links to equipment or room instance
    extendedProps: {
        type: 'equipment' | 'room' | 'maintenance' | 'blackout';
        requestType?: 'request' | 'reservation';
        status: string;
        description: string;
        requesterName?: string;
        [key: string]: any;
    };
}

export interface SystemSetting {
    id: string; // e.g., 'minimumLeadDays', 'maxReservationDays'
    value: any;
    description: string;
}


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
  details: string; // e.g., "Item: Projector, SN: 123 returned 2 days late."
  amount: number;
  isPaid: boolean;
  createdAt: string; // ISO string
}
