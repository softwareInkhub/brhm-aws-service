'use client';

import { Button } from "@/app/components/ui/button";
import { Bell, Settings } from "lucide-react";

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 w-full">
      <div className="px-6 md:px-8 sm:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center ">
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Bell className="h-5 w-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Settings className="h-5 w-5 text-gray-500" />
            </Button>
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="flex">
                <span className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium text-sm">
                  AU
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}; 