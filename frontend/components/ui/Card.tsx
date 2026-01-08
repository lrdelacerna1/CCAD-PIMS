import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`w-full bg-white rounded-xl shadow-sm dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-slate-800 dark:border-slate-700 ${className}`}>
    <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
      {children}
    </div>
  </div>
);