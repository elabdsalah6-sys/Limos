const otpStore = new Map();

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveOtp = (email, code) => {
  otpStore.set(email, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0,
  });
};

const verifyOtp = (email, code) => {
  const entry = otpStore.get(email);
  if (!entry)
    return { valid: false, reason: "No code found. Please request a new one." };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email);
    return {
      valid: false,
      reason: "Code has expired. Please request a new one.",
    };
  }
  if (entry.attempts >= 5) {
    otpStore.delete(email);
    return {
      valid: false,
      reason: "Too many attempts. Please request a new code.",
    };
  }
  if (entry.code !== code) {
    entry.attempts++;
    return { valid: false, reason: "Invalid code. Please try again." };
  }
  otpStore.delete(email);
  return { valid: true };
};

const deleteOtp = (email) => otpStore.delete(email);

module.exports = { generateOtp, saveOtp, verifyOtp, deleteOtp };
