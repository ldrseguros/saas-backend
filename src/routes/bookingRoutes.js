import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { requireTenantAccess } from "../middlewares/tenantMiddleware.js";
import {
  // Admin functions
  getAllBookingsAdmin,
  createBookingAdmin,
  getBookingByIdAdmin,
  updateBookingAdmin,
  deleteBookingAdmin,
  cancelBookingAdmin,
  completeBookingAdmin,
  // Client functions
  getMyBookings,
  createMyBooking,
  getMyBookingById,
  cancelMyBooking,
  rescheduleMyBooking,
  // Public functions
  getAvailableTimeSlots,
} from "../controllers/bookingController.js";

const router = express.Router();

// --- Public routes ---
router.get("/available-slots", getAvailableTimeSlots);

// --- Admin routes for managing all bookings ---
router
  .route("/admin")
  .all(
    protect,
    requireTenantAccess,
    authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN")
  )
  .get(getAllBookingsAdmin)
  .post(createBookingAdmin);

router
  .route("/admin/:id")
  .all(
    protect,
    requireTenantAccess,
    authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN")
  )
  .get(getBookingByIdAdmin)
  .put(updateBookingAdmin)
  .delete(deleteBookingAdmin); // NOTE: deleteBookingAdmin é usado aqui também

// Admin route for booking actions (cancel/complete for specific IDs)
router
  .route("/:id/cancel")
  .all(
    protect,
    requireTenantAccess,
    authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN")
  )
  .patch(cancelBookingAdmin);

router
  .route("/:id/complete")
  .all(
    protect,
    requireTenantAccess,
    authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN")
  )
  .patch(completeBookingAdmin);


router
  .route("/client")
  .all(protect, authorizeRoles("CLIENT"))
  .get(getMyBookings)
  .post(createMyBooking);

router
  .route("/client/:id")
  .all(protect, authorizeRoles("CLIENT"))
  .get(getMyBookingById);

router
  .route("/client/:id/cancel")
  .all(protect, authorizeRoles("CLIENT"))
  .put(cancelMyBooking);

router
  .route("/client/:id/reschedule")
  .all(protect, authorizeRoles("CLIENT"))
  .put(rescheduleMyBooking);

router
  .route("/:id")
  .all(
    protect,
    requireTenantAccess,
    authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN")
  )
  .delete(deleteBookingAdmin); // Esta rota é para DELETE /api/bookings/:id

export default router;