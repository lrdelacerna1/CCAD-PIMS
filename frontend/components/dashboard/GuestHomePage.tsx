import React from 'react';
import { Link } from 'react-router-dom';
import { ViewGridIcon, CalendarPlusIcon, CheckCircleIcon } from '../Icons';
import { Button } from '../ui/Button';

// Brand Color: #880000 (Red)
// Feature Card: White bg, Red top border, Red Icon
const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 text-center border-t-4 border-ccad-red">
        <div className="flex justify-center items-center mb-4 w-12 h-12 rounded-full bg-ccad-bg-light dark:bg-slate-700 mx-auto text-ccad-red">
            {icon}
        </div>
        <h3 className="mb-2 text-xl font-bold dark:text-white font-heading">{title}</h3>
        <p className="text-ccad-text-secondary dark:text-slate-400">{children}</p>
    </div>
);

// Steps: White circle with Red Border and Red Text (No Red Background)
const Step: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="relative">
        <div className="absolute -left-4 top-1 flex items-center justify-center w-8 h-8 bg-white border-2 border-ccad-red text-ccad-red font-bold rounded-full">
            {number}
        </div>
        <div className="pl-8">
            <h4 className="font-bold text-lg text-ccad-black dark:text-white font-heading">{title}</h4>
            <p className="text-ccad-text-secondary dark:text-slate-400">{children}</p>
        </div>
    </div>
);


const GuestHomePage: React.FC = () => {
    return (
        <>
            <div className="bg-slate-50 dark:bg-slate-900">
                {/* Hero Section */}
                <section className="py-20 md:py-32 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-100 to-ccad-bg-light dark:from-slate-900 dark:to-slate-800 opacity-50 z-0"></div>
                    <div className="container mx-auto px-6 text-center relative z-10">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-ccad-black dark:text-white leading-tight mb-4 font-heading">
                            Streamline Your <span className="text-ccad-red">Campus Resources</span>
                        </h1>
                        <p className="text-lg md:text-xl text-ccad-text-secondary dark:text-slate-300 max-w-3xl mx-auto mb-8">
                            The CCAD PIMS provides a centralized platform for managing equipment and room reservations. Browse, reserve, and manage your resources with ease.
                        </p>
                        {/* Updated to flex-row to ensure buttons are side-by-side on all screen sizes */}
                        <div className="flex flex-row justify-center items-center gap-4">
                            <Link to="/login" target="_self">
                                <Button className="!w-auto !h-auto !px-8 !py-4 !text-sm !leading-none shadow-lg">Login</Button>
                            </Link>
                            <Link to="/register" target="_self">
                                <Button variant="secondary" className="!w-auto !h-auto !px-8 !py-4 !text-sm !leading-none">
                                    Register
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-16 bg-white dark:bg-slate-800">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-ccad-black dark:text-white font-heading">Everything You Need in One Place</h2>
                            <p className="text-ccad-text-secondary dark:text-slate-400 mt-2">Manage your campus resource needs efficiently.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <FeatureCard icon={<ViewGridIcon className="w-6 h-6 text-ccad-red" />} title="Resource Catalog">
                                Easily browse a wide range of available equipment and rooms across different campus areas.
                            </FeatureCard>
                            <FeatureCard icon={<CalendarPlusIcon className="w-6 h-6 text-ccad-red" />} title="Availability Calendar">
                                Check resource availability in real-time with our interactive calendar view.
                            </FeatureCard>
                            <FeatureCard icon={<CheckCircleIcon className="w-6 h-6 text-ccad-red" />} title="Simplified Reservations">
                                A straightforward process to request and manage your equipment and room reservations online.
                            </FeatureCard>
                        </div>
                    </div>
                </section>
                
                {/* How It Works Section */}
                <section className="py-16 bg-slate-50 dark:bg-slate-900">
                    <div className="container mx-auto px-6 max-w-3xl">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-bold text-ccad-black dark:text-white font-heading">Get Started in 3 Easy Steps</h2>
                        </div>
                        <div className="space-y-12">
                            <Step number="1" title="Create Your Account">
                                Register for a free account to get started. Log in if you already have one.
                            </Step>
                            <Step number="2" title="Browse and Select">
                                Explore the catalog for equipment and rooms. Check availability for your desired dates.
                            </Step>
                             <Step number="3" title="Reserve and Manage">
                                Add items to your cart and submit your request. Track its status from your dashboard.
                            </Step>
                        </div>
                    </div>
                </section>
            </div>
            
            {/* Footer */}
            <footer className="bg-white dark:bg-slate-800 border-t border-ccad-red dark:border-slate-700">
                <div className="container mx-auto px-6 py-4 text-center text-ccad-text-secondary dark:text-slate-400">
                    &copy; {new Date().getFullYear()} CCAD PIMS. UP Cebu. All rights reserved.
                </div>
            </footer>
        </>
    );
};

export default GuestHomePage;