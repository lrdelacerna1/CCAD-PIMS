export interface User {
  id: string;
  email: string;
  isVerified: boolean;
  role: 'user' | 'admin' | 'superadmin';
  firstName: string;
  lastName: string;
  contactNumber?: string;
  managedAreaIds?: string[];
}

export interface Area {
  id: string;
  name: string;
}

export interface ReservationSettings {
  minimumLeadDays: number;
  penaltyAmount: number;
  penaltyInterval: 'per_day' | 'per_hour';
}

// --- NEW Equipment Request Model ---
export type EquipmentRequestStatus =
  | 'Pending Confirmation'
  | 'For Approval'
  | 'Ready for Pickup'
  | 'Closed'
  | 'Rejected'
  | 'Cancelled';

export const AllEquipmentRequestStatuses: EquipmentRequestStatus[] = [
  'Pending Confirmation',
  'For Approval',
  'Ready for Pickup',
  'Closed',
  'Rejected',
  'Cancelled',
];

export interface EquipmentRequest {
  id: string;
  userId: string;
  userName: string; // denormalized for easier display
  userContact: string;
  endorserEmail?: string;
  endorserName?: string;
  endorserPosition?: string;
  
  // Admin/Faculty IDs
  endorsedByFacultyId?: string | null;
  approvedByAdminId?: string | null;
  releasedByAdminId?: string | null;
  returnCheckedByAdminId?: string | null;

  status: EquipmentRequestStatus;
  purpose: string;
  dateFiled: string; // ISO 8601
  requestedStartDate: string; // YYYY-MM-DD
  requestedEndDate: string; // YYYY-MM-DD
  
  scheduledPickup?: string | null; // ISO 8601
  scheduledReturn?: string | null; // ISO 8601
  actualPickup?: string | null; // ISO 8601
  actualReturn?: string | null; // ISO 8601

  rejectionReason?: string | null;
  cancelledAt?: string | null; // ISO 8601
  cancelledByUserId?: string | null;
  
  isFlaggedNoShow: boolean;
  secondaryContactName: string;
  secondaryContactNumber: string;

  requestedItems: {
    itemId: string;
    name: string;
    areaId: string;
    instanceId?: string | null; // Assigned at pickup
  }[];

  returnDetails?: {
    condition: 'Good' | 'Damaged' | 'Incomplete';
    notes: string;
    returnedAt: string; // ISO 8601 Date string
  };
  
  // AirSlate integration for multi-level approval
  airSlateDocumentId?: string;
  airSlateStatus?: 'Pending Signature' | 'Completed' | 'Rejected';
  airSlateDocumentUrl?: string;
}

// --- NEW Room Request Model ---
export type RoomRequestStatus =
  | 'Pending Confirmation'
  | 'For Approval'
  | 'Ready for Check-in'
  | 'Overdue'
  | 'Closed'
  | 'Rejected'
  | 'Cancelled';

export const AllRoomRequestStatuses: RoomRequestStatus[] = [
  'Pending Confirmation',
  'For Approval',
  'Ready for Check-in',
  'Overdue',
  'Closed',
  'Rejected',
  'Cancelled',
];

export interface RoomRequest {
  id: string;
  userId: string;
  userName: string; // denormalized
  userContact: string;
  instanceId?: string | null; // Assigned when a specific room instance is booked
  endorserEmail?: string;
  endorserName?: string;
  endorserPosition?: string;

  // Admin/Faculty IDs
  endorsedByFacultyId?: string | null;
  approvedByAdminId?: string | null;
  
  status: RoomRequestStatus;
  
  dateFiled: string; // ISO 8601
  requestedStartDate: string; // YYYY-MM-DD
  requestedEndDate: string; // YYYY-MM-DD
  requestedStartTime: string; // HH:MM
  requestedEndTime: string; // HH:MM
  
  purpose: string;
  numberOfStudents: number;
  accompanyingStudents: string; // Text field for names
  
  checkedInAt?: string | null; // ISO 8601
  checkedOutAt?: string | null; // ISO 8601

  rejectionReason?: string | null;
  cancelledAt?: string | null; // ISO 8601
  cancelledByUserId?: string | null;
  isFlaggedNoShow: boolean;

  // Link to room
  requestedRoom: {
    roomTypeId: string;
    name: string;
    areaId: string;
  };
  
  // AirSlate integration for multi-level approval
  airSlateDocumentId?: string;
  airSlateStatus?: 'Pending Signature' | 'Completed' | 'Rejected';
  airSlateDocumentUrl?: string;
}


export interface Penalty {
  id: string;
  userId: string;
  // A penalty is now linked to a specific request type
  equipmentRequestId?: string;
  roomRequestId?: string;
  amount: number;
  reason: string;
  isPaid: boolean;
  createdAt: string; // ISO 8601 Date string
}


export interface Notification {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string; // ISO 8601 Date string
  // A notification can be linked to a specific request
  equipmentRequestId?: string;
  roomRequestId?: string;
}


// --- Inventory (Unchanged) ---
export type AvailabilityStatus =
  | 'Available'
  | 'Unavailable: On Hold'
  | 'Unavailable: Reserved'
  | 'Unavailable: Under Maintenance'
  | 'Unavailable: No Instances';

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

export interface InventoryInstance {
    id: string;
    itemId: string;
    serialNumber: string;
    status: InventoryInstanceStatus;
    condition: InventoryInstanceCondition;
    notes?: string;
    photoUrls?: string[];
    blockedDates?: string[];
    assetTag?: string;
    purchaseDate?: string; // YYYY-MM-DD
    warrantyEndDate?: string; // YYYY-MM-DD
    lastMaintenanceDate?: string; // YYYY-MM-DD
}

export interface InventoryItemWithQuantity extends InventoryItem {
    quantity: {
        total: number;
        available: number;
        reserved: number;
        underMaintenance: number;
    };
}

export interface InventoryItemForCatalog extends InventoryItemWithQuantity {
    availabilityStatus: AvailabilityStatus;
    conditionSummary: Partial<Record<InventoryInstanceCondition, number>>;
    availableForDates: number;
}

export interface EquipmentCartEntry {
  item: InventoryItemForCatalog;
  quantity: number;
}


export interface AvailabilityRequest {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    itemIds: string[];
}

export interface InstanceAvailabilityResult {
    itemId: string;
    itemName: string;
    availableInstances: InventoryInstance[];
}

// --- Rooms (Unchanged) ---
export type RoomStatus = 'Available' | 'In Use' | 'Under Maintenance';
export type RoomCondition = 'Newly Renovated' | 'Good' | 'Fair' | 'Poor';

export interface RoomType {
    id: string;
    name: string; // e.g., "Conference Room", "Podcast Studio"
    areaId: string;
    description?: string;
    photoUrl?: string;
    isHidden?: boolean;
}

export interface RoomInstance {
    id: string;
    roomTypeId: string;
    name: string; // e.g., "Conference Room A", "Podcast Studio 1"
    status: RoomStatus;
    condition: RoomCondition;
    notes?: string;
    photoUrls?: string[];
    blockedDates?: string[];
    capacity?: number;
    features?: string[];
    lastCleanedDate?: string; // YYYY-MM-DD
}

export interface RoomTypeWithQuantity extends RoomType {
     quantity: {
        total: number;
        available: number;
        inUse: number;
        underMaintenance: number;
    };
}

export interface RoomTypeForCatalog extends RoomTypeWithQuantity {
    availabilityStatus: AvailabilityStatus;
    availableForDates: number;
}


export interface RoomAvailabilityRequest {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    roomTypeIds: string[];
}

export interface RoomInstanceAvailabilityResult {
    roomTypeId: string;
    roomTypeName: string;
    availableInstances: RoomInstance[];
}

// --- Calendar (Unchanged) ---
export type AvailabilityLevel = 'high' | 'medium' | 'low' | 'none';

export interface DailyAvailability {
    date: string; // YYYY-MM-DD
    level: AvailabilityLevel;
    total: number;
    booked: number;
}

export interface ItemDailyStatus {
    id: string;
    name: string;
    areaId: string;
    totalInstances: number;
    bookedInstances: number;
    isFullyBooked: boolean;
}