import React from 'react';
import { Link } from 'react-router-dom';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto min-h-screen lg:py-0">
    <Link to="/" target="_self" className="flex items-center mb-6 text-2xl font-bold text-slate-900 dark:text-white font-heading">
      <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTjnrTFy093ow4u_cYqfjHDWz120-MGeLs_2w&s" alt="CCAD PIMS Logo" className="w-10 h-10 mr-2 object-contain" />
      CCAD PIMS
    </Link>
    {children}
  </div>
);