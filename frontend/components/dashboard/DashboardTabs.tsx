import React, { useState } from 'react';
import { Area } from '../../types';
import AreaContent from './AreaContent';

interface DashboardTabsProps {
    tabs: Area[];
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({ tabs }) => {
    const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || '');
    
    if (!tabs.length) {
        return null;
    }
    
    const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];

    const activeTabClasses = "inline-block p-4 text-blue-600 bg-gray-100 rounded-t-lg active dark:bg-gray-800 dark:text-blue-500";
    const inactiveTabClasses = "inline-block p-4 rounded-t-lg hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300";

    return (
        <div>
            <div className="border-b border-gray-200 dark:border-gray-700">
                <ul className="flex flex-wrap -mb-px text-sm font-medium text-center text-gray-500 dark:text-gray-400">
                    {tabs.map(tab => (
                        <li key={tab.id} className="mr-2">
                            <button
                                onClick={() => setActiveTabId(tab.id)}
                                className={tab.id === activeTabId ? activeTabClasses : inactiveTabClasses}
                            >
                                {tab.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-b-lg shadow-md">
                <AreaContent area={activeTab} />
            </div>
        </div>
    );
};

export default DashboardTabs;
