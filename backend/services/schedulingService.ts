
import { EquipmentRequestService } from "./equipmentRequestService";
import { RoomRequestService } from "./roomRequestService";
import { PenaltyService } from "./penaltyService";
import { AreaService } from "./areaService"; // Import AreaService
import { EquipmentRequest, RoomRequest } from "../../frontend/types";

export class SchedulingService {

    static async checkOverdueItems() {
        console.log('Starting to check for overdue items...');
        const now = new Date();

        // Overdue Equipment
        const approvedEquipmentRequests = await EquipmentRequestService.getAll();
        const overdueEquipment = approvedEquipmentRequests.filter(req => {
            const returnDate = req.returnDate ? new Date(req.returnDate) : null;
            return req.status === 'Approved' && returnDate && returnDate < now;
        });

        console.log(`Found ${overdueEquipment.length} overdue equipment requests.`);

        for (const req of overdueEquipment) {
            // Fetch area-specific penalty amount
            const area = await AreaService.getAreaById(req.areaId);
            const penaltyAmount = area?.penaltyAmount || 0; // Use a default of 0 if not set

            await PenaltyService.createPenalty({
                userId: req.userId,
                reason: `Overdue Equipment: ${req.equipmentName}`,
                amount: penaltyAmount,
                isPaid: false,
                requestId: req.id,
                requestType: 'equipment',
            });
            console.log(`Created penalty for user ${req.userId} for overdue equipment ${req.equipmentName}.`);
        }

        // Overdue Rooms
        const approvedRoomRequests = await RoomRequestService.getAll();
        const overdueRooms = approvedRoomRequests.filter(req => {
            const returnDate = req.returnDate ? new Date(req.returnDate) : null;
            return req.status === 'Approved' && returnDate && returnDate < now;
        });
        
        console.log(`Found ${overdueRooms.length} overdue room requests.`);

        for (const req of overdueRooms) {
            // Fetch area-specific penalty amount
            const area = await AreaService.getAreaById(req.areaId);
            const penaltyAmount = area?.penaltyAmount || 0; // Use a default of 0 if not set

            await PenaltyService.createPenalty({
                userId: req.userId,
                reason: `Overdue Room: ${req.roomName}`,
                amount: penaltyAmount,
                isPaid: false,
                requestId: req.id,
                requestType: 'room',
            });
            console.log(`Created penalty for user ${req.userId} for overdue room ${req.roomName}.`);
        }
        
        console.log('Finished checking for overdue items.');
    }
}
