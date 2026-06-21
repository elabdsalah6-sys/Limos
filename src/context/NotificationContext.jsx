import { createContext, useContext, useEffect, useState } from "react";
import API from "../api/axios";
import { useAuth } from "./AuthContext";

const NotificationCtx = createContext({});

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notification, setNotification] = useState("");

  const fetchNotification = async () => {
    try {
      const { data } = await API.get("/settings/notification");
      setNotification(data.message ?? "");
    } catch {}
  };

  useEffect(() => {
    if (user) fetchNotification();
    else setNotification("");
  }, [user]);

  return (
    <NotificationCtx.Provider
      value={{ notification, setNotification, fetchNotification }}
    >
      {children}
    </NotificationCtx.Provider>
  );
};

export const useNotification = () => useContext(NotificationCtx);
