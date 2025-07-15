import { PrismaClient } from "@prisma/client";
import {
  fetchAllBookingsAdmin,
  addNewBookingAdmin as addNewBookingAdminService,
  fetchBookingByIdAdmin,
  modifyBookingAdmin,
  removeBookingAdmin,
  fetchMyBookingsClient,
  addNewBookingClient,
  fetchMyBookingByIdClient,
  cancelMyBookingClient,
  // updateMyBookingClient, // Assuming this will be added to service later if needed
} from "../services/bookingService.js";
import { log } from "console";
import { CatalogItem } from "twilio/lib/rest/content/v1/content.js";

const prisma = new PrismaClient();

// Helper function to get clientProfileId from authAccountId (reusable)
// This helper is now in bookingService.js or a more centralized place.
// const getClientProfileId = async (authAccountId) => { ... }

// --- ADMIN BOOKING FUNCTIONS ---

// @desc    Get all bookings (for Admin)
// @route   GET /api/admin/bookings or /api/bookings/admin
// @access  Admin
export const getAllBookingsAdmin = async (req, res) => {
  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const fromDate = req.query.fromDate;
    const bookings = await fetchAllBookingsAdmin({ limit, fromDate, tenantId });
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error in getAllBookingsAdmin controller:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error getting all bookings for admin",
    });
  }
};

// @desc    Create a new booking (for Admin)
// @route   POST /api/admin/bookings or /api/bookings/admin
// @access  Admin
export const createBookingAdmin = async (req, res) => {
  console.log("POST /api/bookings/admin endpoint called");
  console.log("Request body:", req.body);

  const {
    clientId,
    vehicleId,
    serviceIds,
    date,
    time,
    status,
    specialInstructions,
    location,
  } = req.body;

  if (
    !clientId ||
    !vehicleId ||
    !serviceIds ||
    serviceIds.length === 0 ||
    !date ||
    !time ||
    !status
  ) {
    console.log("Missing required fields", {
      clientId,
      vehicleId,
      serviceIds,
      date,
      time,
      status,
    });
    return res.status(400).json({ message: "Dados obrigatórios ausentes." });
  }

  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const newBooking = await addNewBookingAdminService({
      clientId,
      vehicleId,
      serviceIds,
      date,
      time,
      status,
      specialInstructions,
      location,
      tenantId,
    });

    console.log("New booking created successfully:", newBooking);
    res.status(201).json(newBooking);
  } catch (error) {
    console.error("Error in createBookingAdmin controller:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Error creating booking",
    });
  }
};

// @desc    Get booking by ID (for Admin)
// @route   GET /api/admin/bookings/:id or /api/bookings/admin/:id
// @access  Admin
export const getBookingByIdAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const booking = await fetchBookingByIdAdmin(id, tenantId);
    res.status(200).json(booking);
  } catch (error) {
    console.error(
      `Error in getBookingByIdAdmin controller for ID ${id}:`,
      error
    );
    res.status(error.statusCode || 500).json({
      message: error.message || `Error getting booking by ID ${id} for admin`,
    });
  }
};

// @desc    Update booking (for Admin)
// @route   PUT /api/admin/bookings/:id or /api/bookings/admin/:id
// @access  Admin
export const updateBookingAdmin = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const updatedBooking = await modifyBookingAdmin(id, updates, tenantId);
    res.status(200).json(updatedBooking);
  } catch (error) {
    console.error(
      `Error in updateBookingAdmin controller for ID ${id}:`,
      error
    );
    res.status(error.statusCode || 500).json({
      message:
        error.message || `Error updating booking with ID ${id} for admin`,
    });
  }
};

// @desc    Delete booking (for Admin)
// @route   DELETE /api/admin/bookings/:id or /api/bookings/admin/:id
// @access  Admin
export const deleteBookingAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const result = await removeBookingAdmin(id, tenantId);
    res.status(200).json(result); // Service returns a message object
  } catch (error) {
    console.error(
      `Error in deleteBookingAdmin controller for ID ${id}:`,
      error
    );
    res.status(error.statusCode || 500).json({
      message:
        error.message || `Error deleting booking with ID ${id} for admin`,
    });
  }
};

// @desc    Cancel booking (for Admin)
// @route   PATCH /api/bookings/:id/cancel
// @access  Admin
export const cancelBookingAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const result = await modifyBookingAdmin(
      id,
      { status: "cancelled" },
      tenantId
    );
    res.status(200).json({
      message: "Agendamento cancelado com sucesso",
      booking: result,
    });
  } catch (error) {
    console.error(
      `Error in cancelBookingAdmin controller for ID ${id}:`,
      error
    );
    res.status(error.statusCode || 500).json({
      message:
        error.message || `Error cancelling booking with ID ${id} for admin`,
    });
  }
};

// @desc    Complete booking (for Admin)
// @route   PATCH /api/bookings/:id/complete
// @access  Admin
export const completeBookingAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const result = await modifyBookingAdmin(
      id,
      { status: "completed" },
      tenantId
    );
    res.status(200).json({
      message: "Agendamento marcado como concluído",
      booking: result,
    });
  } catch (error) {
    console.error(
      `Error in completeBookingAdmin controller for ID ${id}:`,
      error
    );
    res.status(error.statusCode || 500).json({
      message:
        error.message || `Error completing booking with ID ${id} for admin`,
    });
  }
};

// --- CLIENT BOOKING FUNCTIONS ---

// @desc    Get all bookings for the logged-in client
// @route   GET /api/client/bookings or /api/bookings/client
// @access  Client (requires auth)
export const getMyBookings = async (req, res) => {
  // Assumes req.user.id is populated by authentication middleware (e.g., JWT strategy)
  // This ID should be the authAccountId
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  const authAccountId = req.user.id;

  try {
    const bookings = await fetchMyBookingsClient(authAccountId);
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error in getMyBookings controller:", error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Error fetching your bookings" });
  }
};

// @desc    Create new booking for the logged-in client
// @route   POST /api/client/bookings or /api/bookings/client
// @access  Client (requires auth)
export const createMyBooking = async (req, res) => {
  console.log("[createMyBooking Controller] ---INICIANDO---")
  
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  const authAccountId = req.user.id;

  const {
    vehicleId,
    serviceIds,
    date,
    time,
    status = "pending", // Default status
    specialInstructions,
    location,
    phone, // Add phone here
  } = req.body;

  if (!vehicleId || !serviceIds || serviceIds.length === 0 || !date || !time) {
    return res
      .status(400)
      .json({ message: "Vehicle, services, date, and time are required." });
  }

  try {
    const bookingData = {
      vehicleId,
      serviceIds,
      date,
      time,
      status,
      specialInstructions,
      location,
      phone, // Pass phone here
    };
    console.log("[crateMyBooking Controller] Chamando addNewBookingClient...")
    const newBooking = await addNewBookingClient(authAccountId, bookingData);
    console.log("[createMyBooking Controller] Agendamento criado com sucesso...")
    res.status(201).json(newBooking);

  } catch (error) {
    console.error("Error in createMyBooking controller:", error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Error creating your booking" });
  }
};

// @desc    Get a specific booking by ID for the logged-in client
// @route   GET /api/client/bookings/:id or /api/bookings/client/:id
// @access  Client (requires auth)
export const getMyBookingById = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  const authAccountId = req.user.id;
  const { id: bookingId } = req.params;

  try {
    const booking = await fetchMyBookingByIdClient(authAccountId, bookingId);
    res.status(200).json(booking);
  } catch (error) {
    console.error(
      `Error in getMyBookingById controller for booking ID ${bookingId}:`,
      error
    );
    res.status(error.statusCode || 500).json({
      message: error.message || "Error fetching your booking details",
    });
  }
};

// @desc    Cancel a booking for the logged-in client
// @route   PUT /api/client/bookings/:id/cancel or /api/bookings/client/:id/cancel (or DELETE)
//          Using PUT for now to align with service, could be DELETE as well.
// @access  Client (requires auth)
export const cancelMyBooking = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  const authAccountId = req.user.id;
  const { id: bookingId } = req.params;

  // Optional: Add logic for what statuses can be cancelled (e.g., only 'pending' or 'confirmed')
  // This logic could be in the service layer.

  try {
    const result = await cancelMyBookingClient(authAccountId, bookingId); // Service handles changing status or deleting
    res.status(200).json(result);
  } catch (error) {
    console.error(
      `Error in cancelMyBooking controller for booking ID ${bookingId}:`,
      error
    );
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Error cancelling your booking" });
  }
};

// @desc    Update (Re-schedule) a booking for the logged-in client
// @route   PUT /api/client/bookings/:id or /api/bookings/client/:id
// @access  Client (requires auth)
// NOTE: This function was not fully defined in the original controller or service.
// Adding a placeholder structure. The service layer would need `updateMyBookingClient`.
export const updateMyBooking = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  const authAccountId = req.user.id;
  const { id: bookingId } = req.params;
  const updates = req.body; // e.g., { date, time, serviceIds, vehicleId, specialInstructions }

  // Basic validation for updates
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No update data provided." });
  }

  // Example: Prevent status updates by client directly through this endpoint
  if (updates.status) {
    return res
      .status(403)
      .json({ message: "Clients cannot directly update booking status." });
  }

  try {
    // Assuming a service function like `updateMyBookingClient` exists or will be created
    // const updatedBooking = await updateMyBookingClient(authAccountId, bookingId, updates);
    // For now, returning a not implemented error as the service function is not confirmed.
    console.warn(
      `updateMyBookingClient service function not yet implemented for booking ID ${bookingId}`
    );
    return res
      .status(501)
      .json({ message: "Updating your booking is not yet implemented." });
    // res.status(200).json(updatedBooking);
  } catch (error) {
    console.error(
      `Error in updateMyBooking controller for booking ID ${bookingId}:`,
      error
    );
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Error updating your booking" });
  }
};

// @desc    Reschedule a booking for the logged-in client
// @route   PUT /api/client/bookings/:id/reschedule or /api/bookings/client/:id/reschedule
// @access  Client (requires auth)
export const rescheduleMyBooking = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  const authAccountId = req.user.id;
  const { id: bookingId } = req.params;
  const { date, time } = req.body;

  // Basic validation
  if (!date || !time) {
    return res
      .status(400)
      .json({ message: "Date and time are required for rescheduling." });
  }

  try {
    // Verify the booking exists and belongs to the client
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        vehicle: {
          include: {
            client: {
              include: {
                account: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify ownership
    if (booking.vehicle.client.account.id !== authAccountId) {
      return res.status(403).json({
        message: "You do not have permission to reschedule this booking",
      });
    }

    // Converter a data e hora para um objeto Date (interpretado como fuso horário local do servidor)
    const localDateTime = new Date(`${date}T${time}:00`);

    // Verificar se a data é válida (opcional, mas recomendado)
    if (isNaN(localDateTime.getTime())) {
      return res.status(400).json({ message: "Invalid date or time format." });
    }

    // Update the booking with new date and time
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        date: localDateTime, // Salvar o objeto Date
        time: time,
        status: "rescheduled", // You can decide if you want to change status or keep as is
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        vehicle: true,
      },
    });

    res.status(200).json({
      message: "Booking rescheduled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error(
      `Error in rescheduleMyBooking controller for booking ID ${bookingId}:`,
      error
    );
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Error rescheduling your booking" });
  }
};

// @desc    Get available time slots for a specific date
// @route   GET /api/bookings/available-slots
// @access  Public
export const getAvailableTimeSlots = async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date parameter is required" });
  }

  try {
    // Em uma implementação real, você buscaria do banco de dados
    // os horários bloqueados e usaria as configurações de horário de funcionamento

    // Por enquanto, retornando horários fixos de funcionamento
    const availableSlots = [
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
    ];

    // Aqui você filtraria os horários já agendados para esta data
    // const bookedSlots = await findBookingsByDate(date);
    // const availableSlots = allTimeSlots.filter(slot => !bookedSlots.includes(slot));

    res.status(200).json({ availableSlots });
  } catch (error) {
    console.error(
      `Error getting available time slots for date ${date}:`,
      error
    );
    res.status(500).json({
      message: "Error fetching available time slots",
      error: error.message,
    });
  }
};
