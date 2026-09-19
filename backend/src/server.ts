import { app } from "./app.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 SecureMAX KYC & Auth Backend running on port ${PORT}`);
});
