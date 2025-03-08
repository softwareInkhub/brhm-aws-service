'use client';

import React from 'react';

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200">
      <div className="px-4 py-3 lg:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl font-semibold text-gray-800">
              AWS Dashboard
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              type="button" 
              className="flex items-center text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 p-1.5"
            >
              <img 
                className="w-8 h-8 rounded-full" 
                src="https://ui-avatars.com/api/?name=Admin+User&background=0D9488&color=fff" 
                alt="user photo" 
              />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}; 