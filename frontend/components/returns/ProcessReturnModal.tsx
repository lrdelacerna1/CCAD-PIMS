import React, { useState } from 'react';
import { EquipmentRequest, InventoryItem, Penalty } from '../../types';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Textarea } from '../ui/Textarea';
import { updateEquipmentRequestStatusApi } from '../../../backend/api/equipmentRequests';
import { createPenaltyApi } from '../../../backend/api/penalties';

interface ProcessReturnModalProps {
  request: EquipmentRequest;
  onClose: () => void;
  onSuccess: () => void;
}

const ProcessReturnModal: React.FC<ProcessReturnModalProps> = ({ request, onClose, onSuccess }) => {
  const [damagedItems, setDamagedItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleToggleDamaged = (itemId: string) => {
    setDamagedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const isLateReturn = new Date() > new Date(request.requestedEndDate);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Create penalties if necessary
      if (isLateReturn) {
        const penalty: Omit<Penalty, 'id'> = {
          userId: request.userId,
          userName: request.userName,
          requestType: 'equipment',
          requestId: request.id,
          reason: 'Late Return',
          details: `Equipment returned after the due date of ${request.requestedEndDate}`,
          amount: 50, // Example amount
          isPaid: false,
          createdAt: new Date().toISOString(),
        };
        await createPenaltyApi(penalty);
      }

      for (const itemId in damagedItems) {
        if (damagedItems[itemId]) {
            const item = request.requestedItems.find(i => i.itemId === itemId);
            const penalty: Omit<Penalty, 'id'> = {
                userId: request.userId,
                userName: request.userName,
                requestType: 'equipment',
                requestId: request.id,
                reason: 'Damaged Equipment',
                details: `Item: ${item?.name} was reported as damaged. Notes: ${notes}`,
                amount: 100, // Example amount
                isPaid: false,
                createdAt: new Date().toISOString(),
            };
            await createPenaltyApi(penalty);
        }
      }

      // Update the request status
      await updateEquipmentRequestStatusApi(request.id, 'completed');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to process return.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-slate-700">
          <h3 className="text-xl font-bold">Process Return</h3>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
        <div className="p-6 space-y-4">
          {isLateReturn && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p>This return is late and will incur a penalty.</p>
            </div>
          )}
          <div>
            <h4 className="font-semibold mb-2">Items Returned:</h4>
            <ul className="space-y-2">
              {request.requestedItems.map(item => (
                <li key={item.itemId} className="flex items-center justify-between">
                  <span>{item.name}</span>
                  <Checkbox
                    id={`damaged-${item.itemId}`}
                    label="Damaged"
                    checked={damagedItems[item.itemId] || false}
                    onChange={() => handleToggleDamaged(item.itemId)}
                  />
                </li>
              ))}
            </ul>
          </div>
          <Textarea
            label="Notes (optional)"
            id="return-notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any notes about the return, especially for damaged items."
          />
        </div>
        <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600">
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>Complete Return</Button>
        </div>
      </div>
    </div>
  );
};

export default ProcessReturnModal;
