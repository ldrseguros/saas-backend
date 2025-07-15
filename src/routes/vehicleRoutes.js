import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import {
  getAllVehiclesAdmin,
  createVehicleAdmin,
  getVehicleByIdAdmin,
  updateVehicleAdmin,
  deleteVehicleAdmin,
  getMyVehicles,
  createMyVehicle,
  getMyVehicleById,
  updateMyVehicle,
  deleteMyVehicle,
  getVehiclesByClientIdAdmin,
} from "../controllers/vehicleController.js";

const router = express.Router();

// Middleware para logar requisições que chegam a este router
router.use((req, res, next) => {
  console.log(
    `[Vehicle Router] Recebida requisição: ${req.method} ${req.originalUrl } -- Path do Router: ${req.baseUrl}${req.path}`
  );
  next();
});

// Admin routes for managing all vehicles
router
  .route("/admin")
  .all(protect, authorizeRoles("ADMIN")) // Apply to all methods on this path
  .get(getAllVehiclesAdmin)
  .post(createVehicleAdmin)
  .put(updateVehicleAdmin)
  .delete(deleteVehicleAdmin);

// Admin route to fetch vehicles by client ID
router
  .route("/admin/clients/:clientId/vehicles")
  .all(protect, authorizeRoles("ADMIN"))
  .get(getVehiclesByClientIdAdmin);

// Client routes for managing their own vehicles
// ESTA É A ROTA QUE VOCÊ QUER PARA O POST DE CADASTRAR VEÍCULO
router
  .route("/client") // Se o frontend envia para /api/vehicles/client, este '/client' se encaixa
  .all(protect, authorizeRoles("CLIENT"))
  .get(getMyVehicles)
  .post(createMyVehicle);

// ESTA É A ROTA PARA OS MÉTODOS COM ID (GET, PUT, DELETE)
router
  .route("/client/:id") // Se o frontend envia para /api/vehicles/client/:id, este '/client/:id' se encaixa
  .all(protect, authorizeRoles("CLIENT"))
  .get(getMyVehicleById)
  .put(updateMyVehicle)
  .delete(deleteMyVehicle);

export default router;