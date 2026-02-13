import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { InventoryIcon, BuildingOfficeIcon, XIcon, ClipboardDocumentCheckIcon, UserGroupIcon, TagIcon, CalendarPlusIcon } from '../Icons';

interface AboutModalProps {
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';
    const isAdmin = user?.role === 'admin';
    const isAdminOrSuperAdmin = isSuperAdmin || isAdmin;

    const [activeTab, setActiveTab] = useState(isAdminOrSuperAdmin ? 'requests' : 'howTo');

    // Updated to use Black for active state instead of Maroon
    const activeTabClasses = "border-black text-black dark:text-white font-bold";
    const inactiveTabClasses = "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-600 dark:text-slate-400 dark:hover:border-slate-200 dark:hover:text-slate-300";

    const LegendItem: React.FC<{ label: string; badgeClass: string; description: string }> = ({ label, badgeClass, description }) => (
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <div className="sm:w-2/5 flex-shrink-0">
                <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${badgeClass}`}>
                    {label}
                </span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
                {description}
            </div>
        </div>
    );

    const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
        <div className="flex items-center gap-2 mb-3 mt-8 first:mt-0 pb-2 border-b border-slate-200 dark:border-slate-600">
            {icon}
            <h4 className="font-bold text-lg text-slate-800 dark:text-white font-heading">{title}</h4>
        </div>
    );

    const FAQItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => (
        <div className="py-3 border-t border-slate-100 dark:border-slate-700 first:border-0">
            <p className="font-semibold text-slate-700 dark:text-slate-200">{question}</p>
            <div className="mt-1 text-slate-600 dark:text-slate-300">{children}</div>
        </div>
    );
    
    const renderAdminContent = () => {
         switch (activeTab) {
            case 'requests':
                return (
                    <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white font-heading">Managing User Requests</h3>
                        <p>Your primary role is to process incoming requests for resources. The <span className="font-semibold">'Reservations'</span> page is your main queue for items needing immediate attention.</p>
                        
                        <SectionHeader icon={<ClipboardDocumentCheckIcon className="w-5 h-5 text-black dark:text-white"/>} title="The Request Lifecycle" />
                        <ul className="list-decimal list-inside space-y-3 pl-2">
                            <li><span className="font-semibold">Pending Endorsement:</span> A student has submitted a request that requires faculty endorsement. It will not appear in your main approval queue until it is endorsed.</li>
                            <li><span className="font-semibold">Pending Approval:</span> The request has been endorsed (or was submitted by a non-student) and now appears in your 'Reservations' queue. You should review the purpose and dates, then either approve or reject it.</li>
                            <li><span className="font-semibold">Approve:</span> Approving a request changes its status to 'Approved'. The user is notified. You can then proceed to mark it as 'Ready for Pickup' or 'Ready for Check-in' when the time comes.</li>
                            <li><span className="font-semibold">Reject:</span> If a request cannot be fulfilled, reject it. The user will be notified.</li>
                             <li><span className="font-semibold">Closed/Completed/Returned:</span> The reservation is complete. This happens after an item has been successfully returned or a room booking has ended.</li>
                        </ul>

                        <SectionHeader icon={<ClipboardDocumentCheckIcon className="w-5 h-5 text-black dark:text-white"/>} title="Frequently Asked Questions (FAQ)" />
                         <div className="space-y-2">
                            <FAQItem question="What if multiple requests for the same item overlap?">
                                <p>The system prevents this automatically. Once a request is submitted, the resources are "soft-reserved" and won't appear as available in the catalog for overlapping dates. You simply need to approve/reject requests from your queue based on your local policy (e.g., first-come, first-served).</p>
                            </FAQItem>
                            <FAQItem question="What happens if a user doesn't pick up an item?">
                                <p>Requests that are not picked up by the end of their reservation date can be flagged as a 'No-Show'. This is handled in the returns/accountability section. Repeated no-shows may lead to penalties.</p>
                            </FAQItem>
                        </div>
                    </div>
                );
            case 'inventory':
                 return (
                    <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white font-heading">Inventory Management</h3>
                        <p>The inventory system is designed to give you granular control over every physical asset. It's built on two core concepts:</p>

                        <SectionHeader icon={<InventoryIcon className="w-5 h-5 text-black dark:text-white"/>} title="Item Types vs. Instances" />
                        <dl className="space-y-3">
                            <div>
                                <dt className="font-semibold text-slate-700 dark:text-slate-200">Item Type</dt>
                                <dd>This is the general category of an asset (e.g., "MacBook Pro 16-inch", "Conference Room"). This is what users browse in the public catalog.</dd>
                            </div>
                             <div>
                                <dt className="font-semibold text-slate-700 dark:text-slate-200">Instance</dt>
                                <dd>This is a specific, physical unit of an Item Type (e.g., a MacBook with Serial Number "C02Z1234ABCD"). Each instance has its own unique serial number/name, condition, and availability calendar.</dd>
                            </div>
                        </dl>

                        <SectionHeader icon={<InventoryIcon className="w-5 h-5 text-black dark:text-white"/>} title="Key Admin Actions" />
                        <ul className="list-disc list-inside space-y-2 pl-2">
                            <li><span className="font-semibold">Editing Condition:</span> In an instance's details modal, you can change its condition (e.g., from 'Good' to 'Damaged'). This is crucial for tracking asset health and deciding when repairs are needed.</li>
                            <li><span className="font-semibold">Blocking Dates:</span> Use the 'Calendar' tab in an instance's details to manually mark dates as unavailable. This is perfect for scheduling maintenance or internal use without creating a formal request.</li>
                            <li><span className="font-semibold">Hiding Item Types:</span> You can hide an entire item type from the public catalog. This is useful for assets that are for internal admin use, seasonal, or temporarily out of service.</li>
                        </ul>
                         
                         <SectionHeader icon={<InventoryIcon className="w-5 h-5 text-black dark:text-white"/>} title="Frequently Asked Questions (FAQ)" />
                         <div className="space-y-2">
                            <FAQItem question="An item was returned damaged. What's the process?">
                                <p>1. When processing the return, mark the item as 'Damaged'.<br/>2. Go to the Inventory page, find the specific instance, and edit its condition to 'Damaged'. This visually flags it for other admins.<br/>3. You can also block out future dates on its calendar for repairs.</p>
                            </FAQItem>
                            <FAQItem question="Why can't I delete an Item Type?">
                                <p>To protect data integrity, you must first delete all instances associated with an item type. Once an item type has zero instances, the delete option will work.</p>
                            </FAQItem>
                        </div>
                    </div>
                );
            case 'users':
                if (!isAdminOrSuperAdmin) return null;
                 return (
                    <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white font-heading">Users, Roles, & Areas</h3>
                        {isSuperAdmin ? (
                            <p>As a Super Admin, you have full control over the system's structure and administrator permissions.</p>
                        ) : (
                            <p>As an Admin, your view and management capabilities are defined by the Areas you are assigned to. This guide explains your role within that structure.</p>
                        )}


                        <SectionHeader icon={<UserGroupIcon className="w-5 h-5 text-black dark:text-white"/>} title="Role Breakdown" />
                        <dl className="space-y-3">
                            <div>
                                <dt className="font-semibold text-slate-700 dark:text-slate-200">Super Admin {isSuperAdmin && '(You)'}</dt>
                                <dd>Has unrestricted, global access. Can see and manage all areas, inventory, and requests. This is the only role that can create/delete Areas and assign Admins to them.</dd>
                            </div>
                             <div>
                                <dt className="font-semibold text-slate-700 dark:text-slate-200">Admin {isAdmin && '(You)'}</dt>
                                <dd>Has restricted access. An Admin's view is limited to the specific <span className="font-semibold">Areas</span> they are assigned to. They can only manage inventory and requests that belong to their assigned areas.</dd>
                            </div>
                        </dl>

                        <SectionHeader icon={<UserGroupIcon className="w-5 h-5 text-black dark:text-white"/>} title="Frequently Asked Questions (FAQ)" />
                         <div className="space-y-2">
                            <FAQItem question="What is the point of 'Areas'?">
                                <p>Areas are the core of access control for standard Admins. For a large campus, a Super Admin might create Areas like "Film Department" or "IT Services", then assign different Admins to manage each one, ensuring they only see what's relevant to their role.</p>
                            </FAQItem>
                            {isSuperAdmin && (
                                <FAQItem question="How do I make a regular user into an Admin?">
                                    <p>User roles are managed in the backend database. This admin panel does not allow for role changes. Your responsibility is to take existing users who are already designated as 'Admin' and assign them to the correct Areas to manage.</p>
                                </FAQItem>
                            )}
                            <FAQItem question="As an Admin, I can't see any requests. What should I check?">
                                <p>Your view is limited to the Areas you manage. If you see no requests, it means either there are no pending requests for your assigned area(s), or you may not be assigned to any areas. Contact a Super Admin to verify your area assignments.</p>
                            </FAQItem>
                        </div>
                    </div>
                );
            case 'legend':
                 return (
                     <div>
                        <SectionHeader icon={<TagIcon className="w-5 h-5 text-black dark:text-white" />} title="Request Statuses" />
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 mb-4">
                             <LegendItem label="Pending Endorsement" badgeClass="bg-up-gold-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" description="Awaiting initial endorsement (e.g., from a faculty advisor) before it is sent to an area admin." />
                             <LegendItem label="Pending Approval" badgeClass="bg-up-gold-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" description="The request has been endorsed and is now in the area admin's queue for final review." />
                             <LegendItem label="Approved" badgeClass="bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300" description="Admin has approved the request. The item/room is ready for the user." />
                             <LegendItem label="Ready for Pickup / Check-in" badgeClass="bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300" description="The item/room is ready for the user to pickup or check-in." />
                             <LegendItem label="In Use" badgeClass="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300" description="The item has been picked up or the room has been checked into." />
                             <LegendItem label="Returned / Completed" badgeClass="bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300" description="The reservation is complete." />
                             <LegendItem label="Overdue" badgeClass="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" description="The item was not returned or the room was not checked out on time." />
                             <LegendItem label="Rejected" badgeClass="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" description="Admin has denied the request." />
                             <LegendItem label="Cancelled" badgeClass="bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400" description="The request was cancelled by the user." />
                        </div>

                        <SectionHeader icon={<InventoryIcon className="w-5 h-5 text-black dark:text-white" />} title="Equipment & Room Conditions" />
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3">
                             <LegendItem label="Good / Newly Renovated" badgeClass="bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300" description="Fully functional with no significant defects." />
                             <LegendItem label="Damaged / Fair" badgeClass="bg-up-gold-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" description="Functional but has cosmetic wear or minor issues (e.g., scratches)." />
                             <LegendItem label="Lost/Unusable / Poor" badgeClass="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" description="Item is missing, broken beyond repair, or facility is in disrepair." />
                        </div>
                     </div>
                );
            default:
                return null;
        }
    }
    
    const renderUserContent = () => {
         switch (activeTab) {
            case 'howTo':
                return (
                    <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                        <SectionHeader icon={<CalendarPlusIcon className="w-5 h-5 text-black dark:text-white"/>} title="Making a Request: Step-by-Step" />
                        <ul className="list-decimal list-inside space-y-3 pl-2">
                            <li><span className="font-semibold">Browse the Catalog:</span> Go to the 'Catalog' page to see all available equipment and rooms. You can search and filter by campus area.</li>
                            <li><span className="font-semibold">Select Your Dates:</span> In the cart sidebar on the right, choose the start and end dates for your reservation. The catalog will automatically show what's available for that period.</li>
                            <li><span className="font-semibold">Add to Cart:</span> Click 'Add to Cart' for any item you need. For equipment, you can add multiple types and adjust quantities in the cart. For rooms, you can only reserve one at a time.</li>
                            <li><span className="font-semibold">Finalize & Submit:</span> Once your cart is ready, click 'Finalize Request'. A form will appear where you'll provide details like the purpose of your request and an endorser if you are a student. After submitting, your request is sent for approval.</li>
                        </ul>

                        <SectionHeader icon={<ClipboardDocumentCheckIcon className="w-5 h-5 text-black dark:text-white"/>} title="Frequently Asked Questions (FAQ)" />
                         <div className="space-y-2">
                            <FAQItem question="What happens after I submit my request?">
                                <p>If you are a student, your request will first go to your specified endorser with a status of 'Pending Endorsement'. Once endorsed, its status changes to 'Pending Approval' and is sent to an administrator. If you are not a student, your request goes directly to 'Pending Approval'. You will receive notifications as your request status changes.</p>
                            </FAQItem>
                             <FAQItem question="Why is an item I want 'Unavailable'?">
                                <p>An item is marked as 'Unavailable' if all its units are already reserved by other users for the date range you have selected (including requests that are still pending approval). Try adjusting your dates to see if it becomes available.</p>
                            </FAQItem>
                            <FAQItem question="Can I cancel a request?">
                                <p>Yes, you can cancel most requests from the 'My Reservations' page as long as they are in the 'Pending Endorsement', 'Pending Approval', or 'Approved' status.</p>
                            </FAQItem>
                        </div>
                    </div>
                );
            case 'legend':
                return (
                    <div>
                        <SectionHeader icon={<TagIcon className="w-5 h-5 text-black dark:text-white" />} title="Your Request Statuses" />
                        <div className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-3 mb-4">
                             <LegendItem label="Pending Endorsement" badgeClass="bg-up-gold-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" description="Your request has been submitted and is awaiting endorsement by your specified endorser." />
                             <LegendItem label="Pending Approval" badgeClass="bg-up-gold-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" description="Your request has been endorsed and is now waiting for a final review from an area administrator." />
                             <LegendItem label="Approved" badgeClass="bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300" description="Your request has been approved! It will be ready on the scheduled date." />
                             <LegendItem label="Ready for Pickup / Check-in" badgeClass="bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300" description="The item/room is ready for you." />
                              <LegendItem label="In Use" badgeClass="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300" description="You have picked up the item or checked into the room." />
                             <LegendItem label="Returned / Completed" badgeClass="bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300" description="Your reservation is complete." />
                             <LegendItem label="Overdue" badgeClass="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" description="The item was not returned on time. Please return it as soon as possible to avoid penalties." />
                             <LegendItem label="Rejected" badgeClass="bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" description="An administrator has denied your request. You will receive a notification with the reason." />
                             <LegendItem label="Cancelled" badgeClass="bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400" description="The request was cancelled either by you or an administrator before it was fulfilled." />
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Updated Header with Black Background */}
                <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-black rounded-t-xl text-white">
                    <div>
                        <h3 className="text-xl font-bold font-heading text-white">
                             {isAdminOrSuperAdmin ? 'Admin Guide' : 'System Guide'}
                        </h3>
                        <p className="text-sm text-gray-300">
                             {isAdminOrSuperAdmin ? 'How to use the PIMS admin panel.' : 'How to request campus resources.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6"/>
                    </button>
                </div>
                
                <div className="border-b border-slate-200 dark:border-slate-700 px-6">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {isAdminOrSuperAdmin ? (
                            <>
                                <button onClick={() => setActiveTab('requests')} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'requests' ? activeTabClasses : inactiveTabClasses}`}>
                                    <ClipboardDocumentCheckIcon className="w-5 h-5" /> Managing Requests
                                </button>
                                <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inventory' ? activeTabClasses : inactiveTabClasses}`}>
                                    <InventoryIcon className="w-5 h-5" /> Inventory
                                </button>
                                <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'users' ? activeTabClasses : inactiveTabClasses}`}>
                                    <UserGroupIcon className="w-5 h-5" /> Users & Areas
                                </button>
                                 <button onClick={() => setActiveTab('legend')} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'legend' ? activeTabClasses : inactiveTabClasses}`}>
                                    <TagIcon className="w-5 h-5" /> Status Legend
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setActiveTab('howTo')} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'howTo' ? activeTabClasses : inactiveTabClasses}`}>
                                    <CalendarPlusIcon className="w-5 h-5" /> Making a Request
                                </button>
                                <button onClick={() => setActiveTab('legend')} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'legend' ? activeTabClasses : inactiveTabClasses}`}>
                                    <TagIcon className="w-5 h-5" /> Status Legend
                                </button>
                            </>
                        )}
                    </nav>
                </div>

                <div className="p-6 overflow-y-auto">
                    {isAdminOrSuperAdmin ? renderAdminContent() : renderUserContent()}
                </div>

                <div className="p-4 flex justify-end gap-3 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-b-xl mt-auto">
                    <Button onClick={onClose} className="!w-auto" variant="secondary">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;