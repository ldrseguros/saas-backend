import express from "express";
const router = express.Router();

import { getProtectedData } from "../controllers/protectedController.js";
import { protect } from "../middlewares/authMiddleware.js";

// This route is protected and requires a valid JWT
router.get("/data", protect, getProtectedData);

export default router;
