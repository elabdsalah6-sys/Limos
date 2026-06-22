import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";
import { io } from "socket.io-client";

const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true); // assume open until we hear otherwise
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await API.get("/settings/store-status");
        setIsOpen(data.isOpen);
      } catch {
        // if the request fails, fall back to "open" rather than blocking orders
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

const socket = io(process.env.REACT_APP_API_URL?.replace("/api", "") || "http://localhost:5000");
    socket.on("store_status_changed", ({ isOpen }) => {
      setIsOpen(isOpen);
    });

    return () => socket.disconnect();
  }, []);

  return (
    <StoreContext.Provider value={{ isOpen, setIsOpen, loading }}>
      {" "}
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => useContext(StoreContext);
