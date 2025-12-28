import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import maintenanceRoutes from "./routes/maintainance.routes.js";

dotenv.config();

const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Middleware
app.use(express.json());

// Routes
app.use("/api/maintenance-log", maintenanceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: "Something went wrong",
    error: err.message,
  });
});

// Root route (optional but useful)
app.get("/", (req, res) => {
  res.send(" Maintenance API is running...");
});

// Local development only
if (process.env.NODE_ENV === "development") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT);
}

// Export app for Vercel
export default app;
