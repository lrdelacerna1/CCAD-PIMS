import React, { useState, useEffect } from 'react';
import { getDailyDetailedStatusApi } from '../../../backend/api/calendar';
import { ItemDailyStatus } from '../../types';
import { Button } from '../ui/Button';

interface DailyDetailsModalProps {
    date: string;
    areaId: string;
    resourceType: 'equipment' | 'rooms';
    areasMap: Map<string, string>;
    onClose: () => void;
    onRequest: (item: { name: string; areaId: string }, type: 'equipment' | 'rooms', date: string) => void;
}

const DailyDetailsModal: React.FC<DailyDetailsModalProps> = ({ date, areaId, resourceType, areasMap, onClose, onRequest }) => {
    const [items, setItems] = useState<ItemDailyStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            setIsLoading(true);
            try {
                const data = await getDailyDetailedStatusApi(date, areaId, resourceType);
                setItems(data);
            } catch (error) {
                console.error(`Failed to fetch daily details for ${date}`, error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDetails();
    }, [date, areaId, resourceType]);
    
    const formattedDate = new Date(date + 'T00:00:00Z').toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b dark:border-gray-600">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Availability for {formattedDate}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Viewing {resourceType} in {areaId === 'all' ? 'All Areas' : (areasMap.get(areaId) || 'Unknown Area')}</p>
                </div>

                <div className="p-6 space-y-3 flex-grow overflow-y-auto">
                    {isLoading ? (
                        <p className="dark:text-white text-center">Loading details...</p>
                    ) : items.length > 0 ? (
                        items.map(item => (
                            <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{item.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {areasMap.get(item.areaId) || 'N/A'} - {item.bookedInstances} / {item.totalInstances} reserved
                                    </p>
                                </div>
                                <div>
                                    <Button
                                        onClick={() => onRequest({ name: item.name, areaId: item.areaId }, resourceType, date)}
                                        disabled={item.isFullyBooked}
                                        className="!w-full sm:!w-auto !py-1 !px-3"
                                        title={item.isFullyBooked ? 'Fully booked for this day' : 'Request this item'}
                                    >
                                        {item.isFullyBooked ? 'Booked' : 'Request'}
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-6">No {resourceType} available to show for this day.</p>
                    )}
                </div>

                 <div className="p-6 flex justify-end gap-3 border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                    <Button onClick={onClose} className="!w-auto !bg-gray-300 !text-black hover:!bg-gray-400">Close</Button>
                </div>
            </div>
        </div>
    );
};

export default DailyDetailsModal;