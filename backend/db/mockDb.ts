import { User, Area, Notification, Penalty, EquipmentRequest, RoomRequest, InventoryItem, InventoryInstance, RoomType, RoomInstance, ReservationSettings } from '../../frontend/types';

// --- DB Persistence using LocalStorage for Users and Passwords ---

const initializeUsers = (): User[] => {
    const storedUsers = localStorage.getItem('mock_db_users');
    if (storedUsers) {
        try {
            return JSON.parse(storedUsers);
        } catch (e) {
            console.error("Failed to parse users from localStorage", e);
        }
    }
    const initialUsers: User[] = [
        { id: 'user-1', email: 'superadmin@test.com', isVerified: true, role: 'superadmin', firstName: 'Super', lastName: 'Admin', contactNumber: '111-222-3333', managedAreaIds: [] },
        { id: 'user-2', email: 'admin@test.com', isVerified: true, role: 'admin', firstName: 'Standard', lastName: 'Admin', contactNumber: '444-555-6666', managedAreaIds: ['area-1'] },
        { id: 'user-3', email: 'admin2@test.com', isVerified: true, role: 'admin', firstName: 'AreaTwo', lastName: 'Admin', contactNumber: '777-888-9999', managedAreaIds: ['area-2', 'area-3'] },
        { id: 'user-4', email: 'user@test.com', isVerified: true, role: 'user', firstName: 'Regular', lastName: 'User', contactNumber: '123-456-7890' },
        { id: 'user-5', email: 'user2@test.com', isVerified: true, role: 'user', firstName: 'Another', lastName: 'User', contactNumber: '098-765-4321' },
    ];
    localStorage.setItem('mock_db_users', JSON.stringify(initialUsers));
    return initialUsers;
};

const initializePasswords = (): Map<string, string> => {
    const storedPasswords = localStorage.getItem('mock_db_passwords');
    if (storedPasswords) {
        try {
            return new Map(JSON.parse(storedPasswords));
        } catch (e) {
            console.error("Failed to parse passwords from localStorage", e);
        }
    }
    const initialPasswords = new Map<string, string>([
        ['superadmin@test.com', 'password'], ['admin@test.com', 'password'], ['admin2@test.com', 'password'], ['user@test.com', 'password'], ['user2@test.com', 'password'],
    ]);
    localStorage.setItem('mock_db_passwords', JSON.stringify(Array.from(initialPasswords.entries())));
    return initialPasswords;
};

const initializeSettings = (): ReservationSettings => {
    const storedSettings = localStorage.getItem('mock_db_settings');
    if (storedSettings) {
        try {
            return JSON.parse(storedSettings);
        } catch (e) {
            console.error("Failed to parse settings from localStorage", e);
        }
    }
    // FIX: Added missing properties `penaltyAmount` and `penaltyInterval` to the `initialSettings` object to conform to the `ReservationSettings` interface.
    const initialSettings: ReservationSettings = {
        minimumLeadDays: 2,
        penaltyAmount: 10,
        penaltyInterval: 'per_day',
    };
    localStorage.setItem('mock_db_settings', JSON.stringify(initialSettings));
    return initialSettings;
};

export let users: User[] = initializeUsers();
export let passwords = initializePasswords();
export let reservationSettings: ReservationSettings = initializeSettings();

export const saveUsersAndPasswords = () => {
    try {
        localStorage.setItem('mock_db_users', JSON.stringify(users));
        localStorage.setItem('mock_db_passwords', JSON.stringify(Array.from(passwords.entries())));
    } catch (e) {
        console.error("Failed to save users/passwords to localStorage", e);
    }
};

export const saveSettings = () => {
    try {
        localStorage.setItem('mock_db_settings', JSON.stringify(reservationSettings));
    } catch(e) {
        console.error("Failed to save settings to localStorage", e);
    }
};


// --- Other Mock Data (In-memory) ---

export const areas: Area[] = [
    { id: 'area-1', name: 'Main Campus' }, { id: 'area-2', name: 'West Wing' }, { id: 'area-3', name: 'East Annex' },
];

// --- Date Helpers ---
const today = new Date();
const yesterday = new Date(new Date().setDate(today.getDate() - 1));
const twoDaysAgo = new Date(new Date().setDate(today.getDate() - 2));
const fiveDaysAgo = new Date(new Date().setDate(today.getDate() - 5));
const tomorrow = new Date(new Date().setDate(today.getDate() + 1));
const inTwoDays = new Date(new Date().setDate(today.getDate() + 2));
const formatDate = (date: Date) => date.toISOString().split('T')[0];

// --- NEW Equipment Requests ---
export let equipmentRequests: EquipmentRequest[] = [
    { 
        id: 'eq-req-1', userId: 'user-4', userName: 'Regular User', userContact: 'user@test.com',
        status: 'Ready for Pickup', purpose: 'Class Presentation', dateFiled: new Date().toISOString(),
        endorserName: 'Faculty Member',
        endorserPosition: 'Professor',
        endorserEmail: 'faculty@test.com',
        requestedStartDate: formatDate(inTwoDays), requestedEndDate: formatDate(new Date(new Date().setDate(today.getDate() + 3))),
        scheduledPickup: new Date(inTwoDays.setHours(14, 0, 0, 0)).toISOString(),
        isFlaggedNoShow: false,
        secondaryContactName: 'John Doe',
        secondaryContactNumber: '555-1234',
        requestedItems: [{ itemId: 'item-type-1', name: 'Projector', areaId: 'area-1' }],
    },
    { 
        id: 'eq-req-2', userId: 'user-4', userName: 'Regular User', userContact: 'user@test.com',
        status: 'Closed', purpose: 'Video Shoot', dateFiled: yesterday.toISOString(),
        endorserName: 'Faculty Member',
        endorserPosition: 'Professor',
        endorserEmail: 'faculty@test.com',
        requestedStartDate: formatDate(yesterday), requestedEndDate: formatDate(today),
        scheduledReturn: new Date(today.setHours(17,0,0,0)).toISOString(),
        actualPickup: yesterday.toISOString(),
        actualReturn: today.toISOString(),
        isFlaggedNoShow: false,
        secondaryContactName: 'Jane Smith',
        secondaryContactNumber: '555-5678',
        requestedItems: [{ itemId: 'item-type-2', name: 'Laptop', areaId: 'area-1', instanceId: 'inst-3' }],
    },
    { 
        id: 'eq-req-3', userId: 'user-4', userName: 'Regular User', userContact: 'user@test.com',
        status: 'Closed', purpose: 'Off-site event', dateFiled: fiveDaysAgo.toISOString(),
        endorserName: 'Faculty Member',
        endorserPosition: 'Professor',
        endorserEmail: 'faculty@test.com',
        requestedStartDate: formatDate(fiveDaysAgo), requestedEndDate: formatDate(twoDaysAgo),
        scheduledReturn: new Date(twoDaysAgo.setHours(17,0,0,0)).toISOString(),
        actualPickup: fiveDaysAgo.toISOString(),
        actualReturn: yesterday.toISOString(),
        isFlaggedNoShow: false,
        secondaryContactName: 'Peter Jones',
        secondaryContactNumber: '555-8765',
        requestedItems: [{ itemId: 'item-type-2', name: 'Laptop', areaId: 'area-1', instanceId: 'inst-4' }],
    },
     { 
        id: 'eq-req-4', userId: 'user-4', userName: 'Regular User', userContact: 'user@test.com',
        status: 'Closed', purpose: 'Old Project', dateFiled: fiveDaysAgo.toISOString(),
        endorserName: 'Faculty Member',
        endorserPosition: 'Professor',
        endorserEmail: 'faculty@test.com',
        requestedStartDate: formatDate(fiveDaysAgo), requestedEndDate: formatDate(twoDaysAgo),
        actualPickup: fiveDaysAgo.toISOString(), actualReturn: twoDaysAgo.toISOString(),
        isFlaggedNoShow: false,
        secondaryContactName: 'Mary Williams',
        secondaryContactNumber: '555-4321',
        requestedItems: [{ itemId: 'item-type-2', name: 'Laptop', areaId: 'area-1', instanceId: 'inst-4' }],
        returnDetails: { condition: 'Damaged', notes: 'Screen has a noticeable scratch.', returnedAt: twoDaysAgo.toISOString() }
    },
     { 
        id: 'eq-req-5', userId: 'user-4', userName: 'Regular User', userContact: 'user@test.com',
        status: 'Ready for Pickup', purpose: 'No-show test', dateFiled: twoDaysAgo.toISOString(),
        endorserName: 'Faculty Member',
        endorserPosition: 'Professor',
        endorserEmail: 'faculty@test.com',
        requestedStartDate: formatDate(twoDaysAgo), requestedEndDate: formatDate(yesterday),
        scheduledPickup: new Date(twoDaysAgo.setHours(10, 0, 0, 0)).toISOString(), // In the past
        isFlaggedNoShow: false,
        secondaryContactName: 'Sam Brown',
        secondaryContactNumber: '555-9999',
        requestedItems: [{ itemId: 'item-type-4', name: 'HDMI Cable (10ft)', areaId: 'area-1' }],
    },
];

// --- NEW Room Requests ---
export let roomRequests: RoomRequest[] = [
    {
        id: 'room-req-1', userId: 'user-4', userName: 'Regular User', userContact: 'user@test.com',
        status: 'For Approval', purpose: 'Team Meeting', dateFiled: new Date().toISOString(),
        endorserName: 'Faculty Member',
        endorserPosition: 'Professor',
        endorserEmail: 'faculty@test.com',
        requestedStartDate: formatDate(inTwoDays), requestedEndDate: formatDate(inTwoDays),
        requestedStartTime: '10:00', requestedEndTime: '12:00',
        isFlaggedNoShow: false,
        requestedRoom: { roomTypeId: 'room-type-1', name: 'Conference Room A', areaId: 'area-2' },
        numberOfStudents: 8,
        accompanyingStudents: 'Student A, Student B, Student C, Student D, Student E, Student F, Student G, Student H',
    },
    {
        id: 'room-req-2', userId: 'user-4', userName: 'Regular User', userContact: 'user@test.com',
        status: 'Ready for Check-in', purpose: 'Podcast Recording', dateFiled: yesterday.toISOString(),
        endorserName: 'Faculty Member',
        endorserPosition: 'Professor',
        endorserEmail: 'faculty@test.com',
        requestedStartDate: formatDate(today), requestedEndDate: formatDate(today),
        requestedStartTime: '14:00', requestedEndTime: '16:00',
        isFlaggedNoShow: false,
        requestedRoom: { roomTypeId: 'room-type-2', name: 'Podcast Studio 1', areaId: 'area-3' },
        instanceId: 'room-inst-3',
        numberOfStudents: 2,
        accompanyingStudents: 'Guest Speaker',
    },
     {
        id: 'room-req-3', userId: 'user-4', userName: 'Regular User', userContact: 'user@test.com',
        status: 'Rejected', purpose: 'Cancelled Workshop', dateFiled: twoDaysAgo.toISOString(),
        endorserName: 'Faculty Member',
        endorserPosition: 'Professor',
        endorserEmail: 'faculty@test.com',
        requestedStartDate: formatDate(yesterday), requestedEndDate: formatDate(yesterday),
        requestedStartTime: '09:00', requestedEndTime: '17:00',
        isFlaggedNoShow: false,
        requestedRoom: { roomTypeId: 'room-type-3', name: 'Main Hall', areaId: 'area-1' },
        rejectionReason: 'Event was cancelled by organizer.',
        numberOfStudents: 0,
        accompanyingStudents: '',
    },
];

// --- Inventory (Unchanged) ---
export const inventoryItems: InventoryItem[] = [
    { id: 'item-type-1', name: 'Projector', areaId: 'area-1', description: 'A high-definition projector suitable for presentations in large rooms. Includes HDMI and VGA inputs.', photoUrl: 'https://placehold.co/600x400/a3e635/ffffff?text=Projector' },
    { id: 'item-type-2', name: 'Laptop', areaId: 'area-1', description: 'Standard issue 15-inch laptop with Windows 11, 16GB RAM, and a 512GB SSD. Comes with a charger and a carrying case.', photoUrl: 'https://placehold.co/600x400/60a5fa/ffffff?text=Laptop' },
    { id: 'item-type-3', name: 'Conference Phone', areaId: 'area-2', description: 'A multi-line conference phone with excellent speaker and microphone quality, suitable for up to 10 participants.', photoUrl: 'https://placehold.co/600x400/f87171/ffffff?text=Conference+Phone' },
    { id: 'item-type-4', name: 'HDMI Cable (10ft)', areaId: 'area-1', description: 'A 10-foot long high-speed HDMI cable for connecting devices to displays.', photoUrl: 'https://placehold.co/600x400/fbbf24/ffffff?text=HDMI+Cable' },
];

export let inventoryInstances: InventoryInstance[] = [
    { id: 'inst-1', itemId: 'item-type-1', serialNumber: 'PROJ-001', status: 'Available', condition: 'Good', photoUrls: ['https://placehold.co/600x400/a3e635/ffffff?text=PROJ-001-A', 'https://placehold.co/600x400/a3e635/000000?text=PROJ-001-B'], assetTag: 'EQ-001-01', purchaseDate: '2023-01-15', warrantyEndDate: '2025-01-14', lastMaintenanceDate: '2024-06-01' },
    { id: 'inst-2', itemId: 'item-type-1', serialNumber: 'PROJ-002', status: 'Available', condition: 'Damaged', photoUrls: [], assetTag: 'EQ-001-02', purchaseDate: '2023-01-15', warrantyEndDate: '2025-01-14' },
    { id: 'inst-3', itemId: 'item-type-2', serialNumber: 'LAP-001', status: 'Reserved', condition: 'Good', photoUrls: [], assetTag: 'EQ-002-01', purchaseDate: '2022-08-20' },
    { id: 'inst-4', itemId: 'item-type-2', serialNumber: 'LAP-002', status: 'Reserved', condition: 'Good', photoUrls: [], assetTag: 'EQ-002-02', purchaseDate: '2022-08-20' },
    { id: 'inst-5', itemId: 'item-type-3', serialNumber: 'CONF-001', status: 'Under Maintenance', condition: 'Damaged', notes: 'Static on the line.', photoUrls: [], assetTag: 'EQ-003-01' },
    { id: 'inst-6', itemId: 'item-type-3', serialNumber: 'CONF-002', status: 'Available', condition: 'Lost/Unusable', notes: 'Reported missing on 2024-08-10.', photoUrls: [], assetTag: 'EQ-003-02' },
];

// --- Rooms (Unchanged) ---
export const roomTypes: RoomType[] = [
    { id: 'room-type-1', name: 'Conference Room', areaId: 'area-2', description: 'A medium-sized room for up to 12 people, equipped with a whiteboard, a large monitor, and a conference phone.', photoUrl: 'https://placehold.co/600x400/7dd3fc/ffffff?text=Conference+Room' },
    { id: 'room-type-2', name: 'Podcast Studio', areaId: 'area-3', description: 'A soundproofed studio with professional microphones, an audio mixer, and comfortable seating for up to 4 speakers.', photoUrl: 'https://placehold.co/600x400/c4b5fd/ffffff?text=Podcast+Studio' },
    { id: 'room-type-3', name: 'Main Hall', areaId: 'area-1', description: 'A large, versatile hall that can be configured for presentations, workshops, or events. Seats up to 100 people.', photoUrl: 'https://placehold.co/600x400/f9a8d4/ffffff?text=Main+Hall' },
];

export let roomInstances: RoomInstance[] = [
    { id: 'room-inst-1', roomTypeId: 'room-type-1', name: 'Conference Room A', status: 'Available', condition: 'Good', photoUrls: ['https://placehold.co/600x400/7dd3fc/ffffff?text=Room+A+View+1'], capacity: 12, features: ['Whiteboard', 'Projector', 'Conference Phone'], lastCleanedDate: '2024-07-20' },
    { id: 'room-inst-2', roomTypeId: 'room-type-1', name: 'Conference Room B', status: 'Under Maintenance', condition: 'Fair', notes: 'Projector bulb needs replacement.', photoUrls: [], capacity: 10, features: ['Whiteboard', 'Projector'] },
    { id: 'room-inst-3', roomTypeId: 'room-type-2', name: 'Podcast Studio 1', status: 'Available', condition: 'Newly Renovated', photoUrls: [], capacity: 4, features: ['Microphones', 'Audio Mixer', 'Soundproofing'], lastCleanedDate: '2024-07-22' },
    { id: 'room-inst-4', roomTypeId: 'room-type-3', name: 'Main Hall', status: 'In Use', condition: 'Good', photoUrls: [], capacity: 100, features: ['Stage', 'Podium', 'PA System'] },
];

// --- Notifications & Penalties (Updated to new models) ---
export let notifications: Notification[] = [
    { id: 'notif-1', userId: 'user-4', message: `Your equipment request for 'Class Presentation' is now Ready for Pickup.`, isRead: false, createdAt: new Date(Date.now() - 300000).toISOString(), equipmentRequestId: 'eq-req-1' },
    { id: 'notif-2', userId: 'user-4', message: `A penalty of ₱10.00 was issued for the late return of 'Off-site event'.`, isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString(), equipmentRequestId: 'eq-req-3' },
    { id: 'notif-3', userId: 'user-2', message: 'A new equipment request for a Projector is awaiting your approval.', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString(), equipmentRequestId: 'eq-req-1' },
    { id: 'notif-4', userId: 'user-4', message: `Reminder: Your 'Video Shoot' equipment is due for return today.`, isRead: false, createdAt: new Date().toISOString(), equipmentRequestId: 'eq-req-2' },
    { id: 'notif-5', userId: 'user-4', message: `Your 'Off-site event' equipment is overdue. Please return it as soon as possible.`, isRead: false, createdAt: new Date(Date.now() - 86400000).toISOString(), equipmentRequestId: 'eq-req-3' },
    { id: 'notif-6', userId: 'user-4', message: `A penalty of ₱50.00 was issued for 'Old Project' due to a damaged screen.`, isRead: true, createdAt: new Date(Date.now() - 172000000).toISOString(), equipmentRequestId: 'eq-req-4' },
    { id: 'notif-7', userId: 'user-4', message: `Your room request for 'Podcast Recording' has been approved.`, isRead: true, createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), roomRequestId: 'room-req-2' },
];

export let penalties: Penalty[] = [
    { id: 'pen-1', userId: 'user-4', equipmentRequestId: 'eq-req-3', amount: 10.00, reason: 'Item is 1 day overdue.', isPaid: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'pen-2', userId: 'user-4', equipmentRequestId: 'eq-req-4', amount: 50.00, reason: 'Laptop returned with a large scratch on the screen.', isPaid: false, createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'pen-3', userId: 'user-4', amount: 15.00, reason: 'Late return fee from a previous semester.', isPaid: true, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: 'pen-4', userId: 'user-4', equipmentRequestId: 'eq-req-3', amount: 15.00, reason: 'Item is now 2 days overdue.', isPaid: false, createdAt: new Date(Date.now() - 300000).toISOString() },
];

export const passwordResetTokens = new Map<string, { userId: string; expires: number }>();