
import { NextApiRequest, NextApiResponse } from 'next';
import { SchedulingService } from '../../../services/schedulingService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            await SchedulingService.checkOverdueItems();
            res.status(200).json({ message: 'Overdue items check completed successfully.' });
        } catch (error) {
            console.error("Error during overdue items check:", error);
            res.status(500).json({ message: 'Failed to check for overdue items.' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
