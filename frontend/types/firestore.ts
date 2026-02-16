
import { Timestamp, DocumentReference } from "firebase/firestore";

export interface User {
    firstName: string;
    lastName: string;
    contactNumber: string;
    userType: "student" | "guest" | "faculty" | "admin" | "superadmin";
    emailAddress: string;
    borrowingPrivileges: boolean;
    createdAt: Timestamp;
    lastLogin?: Timestamp;
    role: string;
    photoURL?: string;
}

export interface StudentProfile {
    studentNumber: string;
}

export interface GuestProfile {
    organization: string;
}

export interface Area {
    name: string;
    description: string;
    adminIds: string[];
    facultyIds: string[];
}

export interface Room {
    name: string;
    roomNumber: string;
    location: string;
    areaId: DocumentReference<Area>;
    capacity: number;
    description: string;
    condition: "Good" | "Needs Maintenance" | "Out of Order";
    images: string[];
    createdAt: Timestamp;
}

export interface Equipment {
    serialNumber: string;
    value: number;
    type: string;
    areaId: DocumentReference<Area>;
    condition: "Good" | "Damaged" | "Lost";
    description: string;
    remarks: string;
    images: string[];
    createdAt: Timestamp;
}

export interface UpdateLog {
    timestamp: Timestamp;
    updatedBy: DocumentReference<User>;
    description: string;
}

export interface RoomRequest {
    userId: DocumentReference<User>;
    confirmedByFacultyId?: DocumentReference<User>;
    approvedByAdminId?: DocumentReference<User>;
    dateFiled: Timestamp;
    requestedStartDate: Timestamp;
    requestedEndDate: Timestamp;
    requestedStartTime: string;
    requestedEndTime: string;
    purpose: string;
    numberOfStudents: number;
    accompanyingStudents: string;
    checkedInAt?: Timestamp;
    checkedOutAt?: Timestamp;
    status: "Under Review" | "Confirmed" | "Approved" | "Checked In" | "Completed" | "Rejected" | "Cancelled";
    rejectionReason?: string;
    cancelledAt?: Timestamp;
    cancelledByUserId?: DocumentReference<User>;
    isFlaggedNoShow: boolean;
    roomIds: DocumentReference<Room>[];
    updateLog: UpdateLog[];
}

export interface EquipmentRequestItem {
    equipmentId: DocumentReference<Equipment>;
    quantity: number;
    damageNotes: string;
    isReturned: boolean;
    remarks: string;
}

export interface EquipmentRequest {
    userId: DocumentReference<User>;
    facultyId: DocumentReference<User>;
    approvedByAdminId?: DocumentReference<User>;
    releasedByAdminId?: DocumentReference<User>;
    returnCheckedByAdminId?: DocumentReference<User>;
    purpose: string;
    dateFiled: Timestamp;
    requestedStartDate: Timestamp;
    requestedEndDate: Timestamp;
    scheduledPickup: Timestamp;
    scheduledReturn: Timestamp;
    actualPickup?: Timestamp;
    actualReturn?: Timestamp;
    status: "Under Review" | "Confirmed" | "Approved" | "Equipment Claimed" | "Completed" | "Rejected" | "Cancelled";
    rejectionReason?: string;
    cancelledAt?: Timestamp;
    cancelledByUserId?: DocumentReference<User>;
    isFlaggedNoShow: boolean;
    secondaryContactName: string;
    secondaryContactNumber: string;
    equipmentItems: EquipmentRequestItem[];
    updateLog: UpdateLog[];
}

export interface Penalty {
    userId: DocumentReference<User>;
    roomRequestId?: DocumentReference<RoomRequest>;
    equipmentRequestId?: DocumentReference<EquipmentRequest>;
    type: "Damaged" | "Late" | "Lost";
    description: string;
    amount: number;
    status: "Unpaid" | "Paid" | "Waived";
    issuedDate: Timestamp;
    paidDate?: Timestamp;
    delayMinutes: number;
}

export interface RoomUnavailability {
    roomId: DocumentReference<Room>;
    start: Timestamp;
    end: Timestamp;
    reason: string;
}

export interface EquipmentUnavailability {
    equipmentId: DocumentReference<Equipment>;
    start: Timestamp;
    end: Timestamp;
    reason: string;
}

export interface LatePenaltyFeeRule {
    minMinutes: number;
    maxMinutes: number;
    baseFee: number;
    incrementMinutes: number;
    incrementFee: number;
}

export interface LatePenaltyFeeSettings {
    rules: LatePenaltyFeeRule[];
}

export interface FacultyAppeal {
    id: string;
    uid: string;
    email: string;
    name: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}
