import { useState } from "react";
import { useNotification } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

const NotificationBanner = () => {
  const { user } = useAuth();
  const { notification } = useNotification();
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.role === "admin") return null;
  if (!notification || dismissed) return null;

  return (
    <>
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .notif-track {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 60s linear infinite;
        }
        .notif-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div
        style={{
          background: "#c4712a",
          color: "#fff",
          padding: "8px 0",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          position: "relative",
          zIndex: 99,
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        {/* scrolling text */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <span className="notif-track">
            {/* repeat the message a few times so it feels continuous */}
            {[...Array(4)].map((_, i) => (
              <span key={i} style={{ marginRight: 80 }}>
                <i
                  className="ti ti-speakerphone"
                  style={{ marginRight: 8, fontSize: 14 }}
                />
                {notification}
              </span>
            ))}
          </span>
        </div>

        {/* dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: "rgba(0,0,0,0.15)",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            lineHeight: 1,
            padding: "4px 10px",
            marginRight: 10,
            borderRadius: 999,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    </>
  );
};

export default NotificationBanner;
