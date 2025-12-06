import React, { createContext, useContext, useState, ReactNode } from "react";
import { INotification } from "../types/backendType";

type FilterType = "all" | "unread";

interface NotificationContextProps {
  notifications: INotification[];
  setNotifications: React.Dispatch<React.SetStateAction<INotification[]>>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  filter: FilterType;
  setFilter: React.Dispatch<React.SetStateAction<FilterType>>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const filteredNotifications =
    filter === "all"
      ? notifications
      : notifications.filter((n) => !n.isRead);

  return (
    <NotificationContext.Provider
      value={{
        notifications: filteredNotifications,
        setNotifications,
        markAsRead,
        markAllAsRead,
        filter,
        setFilter,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextProps => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
