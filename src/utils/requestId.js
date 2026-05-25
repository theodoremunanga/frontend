// ================= REQUEST ID =================
export const generateRequestId = () => {
  return (
    "REQ-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).substring(2, 8)
  ).toUpperCase();
};