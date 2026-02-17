import React, { useState, useEffect } from 'react';
import { Penalty } from '../../types';
import { getAllPenaltiesApi, markPenaltyAsPaidApi } from '../../../backend/api/penalties';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { format } from 'date-fns';

const AccountabilityList: React.FC = () => {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchPenalties = async () => {
      try {
        const allPenalties = await getAllPenaltiesApi();
        setPenalties(allPenalties);
      } catch (err: any) {
        setError(err.message || 'Failed to load penalties.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPenalties();
  }, []);

  const handleMarkAsPaid = async (penaltyId: string) => {
    try {
      await markPenaltyAsPaidApi(penaltyId, true);
      setPenalties(penalties.map(p => p.id === penaltyId ? { ...p, isPaid: true } : p));
    } catch (err: any) {
      setError(err.message || 'Failed to update penalty status.');
    }
  };

  const filteredPenalties = penalties
    .filter(p => 
      (p.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
       p.details.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (statusFilter === 'all' || (statusFilter === 'paid' && p.isPaid) || (statusFilter === 'unpaid' && !p.isPaid))
    );

  if (isLoading) return <div>Loading penalties...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Accountabilities</h2>
        <div className="flex gap-2">
          <Input
            id="search-penalties"
            placeholder="Search by name or details"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Select
            id="status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'paid', label: 'Paid' },
              { value: 'unpaid', label: 'Unpaid' },
            ]}
          />
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {filteredPenalties.map(penalty => (
            <li key={penalty.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{penalty.userName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{penalty.reason} - ${penalty.amount}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{penalty.details}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{format(new Date(penalty.createdAt), 'MMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${penalty.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {penalty.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                    {!penalty.isPaid && (
                    <Button onClick={() => handleMarkAsPaid(penalty.id)} size="sm">Mark as Paid</Button>
                    )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AccountabilityList;
