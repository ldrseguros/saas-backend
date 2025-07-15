import express from "express";
import {
  getSettings,
  updateSettings,
} from "../controllers/settingsController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Rotas protegidas - apenas para admin
router
  .route("/")
  .get(protect, admin, getSettings)
  .put(protect, admin, updateSettings);

export default router;
