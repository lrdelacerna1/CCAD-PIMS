import { Penalty } from '../../frontend/types';
import { penalties } from '../db/mockDb';

export class PenaltyService {
    static async getPenaltiesByUserId(userId: string): Promise<Penalty[]> {
        let userPenalties = penalties
            .filter(p => p.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // HACK: For demo purposes, if a new user has no penalties, show the default user's penalties.
        if (userPenalties.length === 0 && userId !== 'user-4') {
            userPenalties = penalties
                .filter(p => p.userId === 'user-4') // The default user with sample data
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return JSON.parse(JSON.stringify(userPenalties));
    }

    static async getAllPenalties(): Promise<Penalty[]> {
        // Return all penalties sorted by date (newest first)
        const allPenalties = [...penalties].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return JSON.parse(JSON.stringify(allPenalties));
    }

    static async markPenaltyAsPaid(penaltyId: string): Promise<void> {
        const penalty = penalties.find(p => p.id === penaltyId);
        if (penalty) {
            penalty.isPaid = true;
        } else {
            throw new Error("Penalty not found");
        }
    }

    static async createPenalty(penaltyData: Omit<Penalty, 'id'>): Promise<Penalty> {
        const newPenalty: Penalty = {
            id: `pen-${Date.now()}`,
            ...penaltyData,
        };
        penalties.push(newPenalty);
        return { ...newPenalty };
    }
}