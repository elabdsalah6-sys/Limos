import "./LoyaltyCard.css";
import STAMP_IMAGE_URL from "./limosStamp.png";

const LoyaltyCard = ({ loyalty }) => {
  if (!loyalty) return null;

  const { stamps, stampsPerReward, stampsTowardNext, rewardsAvailable } =
    loyalty;

  return (
    <div className="loyalty-card">
      <div className="loyalty-card-header">
        <h2>Loyalty Card</h2>
        {rewardsAvailable > 0 && (
          <span className="loyalty-reward-badge">
            {rewardsAvailable} free item{rewardsAvailable > 1 ? "s" : ""} ready!
          </span>
        )}
      </div>

      <div className="loyalty-stamps-grid">
        {Array.from({ length: stampsPerReward }).map((_, i) => {
          const filled = i < stampsTowardNext;
          return (
            <div
              key={i}
              className={`loyalty-stamp ${filled ? "loyalty-stamp--filled" : ""}`}
            >
              {filled && (
                <img
                  src={STAMP_IMAGE_URL}
                  alt="Stamp"
                  className="loyalty-stamp-img"
                />
              )}
            </div>
          );
        })}
      </div>

      <p className="loyalty-card-note">
        {stampsTowardNext} / {stampsPerReward} stamps toward your next free
        Classic LimoRoll
      </p>

      <p className="loyalty-card-note">1 LimoRoll = 1 Stamp.</p>

      {rewardsAvailable > 0 && (
        <p className="loyalty-card-hint">
          Add your free item at checkout on your next order 🎉
        </p>
      )}
    </div>
  );
};

export default LoyaltyCard;
