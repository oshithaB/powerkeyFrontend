import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NotificationContextType {
  hasNearDueCheques: boolean;
  setHasNearDueCheques: (value: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [hasNearDueCheques, setHasNearDueCheques] = useState(false);

  return (
    <NotificationContext.Provider value={{ hasNearDueCheques, setHasNearDueCheques }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};