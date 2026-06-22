import { useState } from "react";

const RippleButton = ({ children, onClick, className, style, disabled }) => {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples((prev) => [...prev, { x, y, id }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);

    onClick?.(e);
  };

  return (
    <button
      className={className}
      style={{ position: "relative", overflow: "hidden", ...style }}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          style={{
            position: "absolute",
            left: r.x,
            top: r.y,
            width: 0,
            height: 0,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.35)",
            transform: "translate(-50%, -50%)",
            animation: "ripple 0.6s ease-out forwards",
            pointerEvents: "none",
          }}
        />
      ))}
    </button>
  );
};

export default RippleButton;