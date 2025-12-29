'use client';

import React, { createContext, useContext } from 'react';
import { AppUser } from '@/types/auth';

const UserContext = createContext<AppUser | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default function UserProvider({ 
  user, 
  children 
}: { 
  user: AppUser | null, 
  children: React.ReactNode 
}) {
  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}