import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createUser,
} from "../controllers/userController.js";

const router = express.Router();

// Apply protect and authorizeRoles middleware to all routes in this file
router.use(protect);
router.use(authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"));

// Define routes for user management
router.route("/").get(getAllUsers).post(createUser); // GET /api/admin/users, POST /api/admin/users

router
  .route("/:id")
  .get(getUserById) // GET /api/admin/users/:id
  .put(updateUser) // PUT /api/admin/users/:id
  .delete(deleteUser); // DELETE /api/admin/users/:id

export default router;
