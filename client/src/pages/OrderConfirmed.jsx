import { useNavigate } from "react-router-dom";

const OrderConfirmed = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: "#f5f0e8",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          background: "#ede8e0",
          borderRadius: "20px",
          padding: "48px 40px",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* icon */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            border: "1.5px solid #c4712a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "8px",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c4712a"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "34px",
            fontWeight: 700,
            color: "#1a0f05",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Order Confirmed
        </h1>

        <div
          style={{
            width: "40px",
            height: "1px",
            background: "#c4712a",
            margin: "0 auto",
          }}
        />

        <p
          style={{
            color: "#7a6858",
            fontSize: "14px",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Thank you for your order. We've received it and will begin preparing
          it shortly. Our team will reach out to confirm your delivery details.
        </p>

        <div
          style={{
            background: "#f5f0e8",
            borderRadius: "10px",
            padding: "14px 20px",
            width: "100%",
            marginTop: "4px",
          }}
        >
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "13px",
              color: "#9a8878",
              margin: "0 0 4px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Estimated Delivery
          </p>
          <p
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#1a0f05",
              margin: 0,
            }}
          >
            30 – 45 minutes
          </p>
        </div>

        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "8px",
            width: "100%",
            padding: "13px",
            background: "#1a0f05",
            color: "#f5f0e8",
            border: "none",
            borderRadius: "10px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            cursor: "pointer",
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default OrderConfirmed;
