import {
  // Admin services
  fetchAllVehiclesAdmin as fetchAllVehiclesAdminService,
  addNewVehicleAdmin as addNewVehicleAdminService,
  fetchVehicleByIdAdmin as fetchVehicleByIdAdminService,
  modifyVehicleAdmin as modifyVehicleAdminService,
  removeVehicleAdmin as removeVehicleAdminService,
  fetchVehiclesByClientIdAdmin as fetchVehiclesByClientIdAdminService,
  // Client services
  fetchMyVehiclesClient as fetchMyVehiclesClientService,
  addNewVehicleClient as addNewVehicleClientService,
  fetchMyVehicleByIdClient as fetchMyVehicleByIdClientService,
  modifyMyVehicleClient as modifyMyVehicleClientService,
  removeMyVehicleClient as removeMyVehicleClientService,
  // Helper for clientProfileId
  getClientProfileIdFromAuthId,
} from "../services/vehicleService.js";

// @desc    Get all vehicles (for Admin)
// @route   GET /api/admin/vehicles
// @access  Admin
export const getAllVehiclesAdmin = async (req, res) => {
  try {
    const vehicles = await fetchAllVehiclesAdminService();
    res.status(200).json(vehicles);
  } catch (error) {
    console.error("Error in getAllVehiclesAdmin controller:", error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Error fetching vehicles" });
  }
};

// @desc    Create a new vehicle (for Admin, assigned to a client)
// @route   POST /api/admin/vehicles
// @access  Admin
export const createVehicleAdmin = async (req, res) => {
  const { brand, model, year, plate, color, clientId } = req.body;
  if (!brand || !model || !plate || !clientId) {
    return res
      .status(400)
      .json({ message: "Brand, model, plate, and clientId are required." });
  }
  try {
    const newVehicle = await addNewVehicleAdminService({
      brand,
      model,
      year,
      plate,
      color,
      clientId,
    });
    res.status(201).json(newVehicle);
  } catch (error) {
    console.error("Error in createVehicleAdmin controller:", error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Error creating vehicle" });
  }
};

// @desc    Get a single vehicle by ID (for Admin)
// @route   GET /api/admin/vehicles/:id
// @access  Admin
export const getVehicleByIdAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const vehicle = await fetchVehicleByIdAdminService(id);
    res.status(200).json(vehicle);
  } catch (error) {
    console.error(
      `Error in getVehicleByIdAdmin controller (ID: ${id}):`,
      error
    );
    res.status(error.statusCode || 500).json({
      message: error.message || `Error fetching vehicle with ID ${id}`,
    });
  }
};

// @desc    Update a vehicle by ID (for Admin)
// @route   PUT /api/admin/vehicles/:id
// @access  Admin
export const updateVehicleAdmin = async (req, res) => {
  const { id } = req.params;
  const { brand, model, year, plate, color, clientId } = req.body; // Include clientId for admin updates
  // Basic validation for required fields if any, or let service handle more complex validation
  try {
    const updatedVehicle = await modifyVehicleAdminService(id, {
      brand,
      model,
      year,
      plate,
      color,
      clientId,
    });
    res.status(200).json(updatedVehicle);
  } catch (error) {
    console.error(`Error in updateVehicleAdmin controller (ID: ${id}):`, error);
    res.status(error.statusCode || 500).json({
      message: error.message || `Error updating vehicle with ID ${id}`,
    });
  }
};

// @desc    Delete a vehicle by ID (for Admin)
// @route   DELETE /api/admin/vehicles/:id
// @access  Admin
export const deleteVehicleAdmin = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await removeVehicleAdminService(id);
    res.status(200).json(result);
  } catch (error) {
    console.error(`Error in deleteVehicleAdmin controller (ID: ${id}):`, error);
    res.status(error.statusCode || 500).json({
      message: error.message || `Error deleting vehicle with ID ${id}`,
    });
  }
};

// @desc    Get all vehicles for a specific client (for Admin)
// @route   GET /api/admin/clients/:clientId/vehicles
// @access  Admin
export const getVehiclesByClientIdAdmin = async (req, res) => {
  const { clientId: authAccountId } = req.params; // Rename clientId to authAccountId for clarity
  try {
    // Get the clientProfileId from the authAccountId
    const clientProfileId = await getClientProfileIdFromAuthId(authAccountId);

    // If clientProfileId is not found (shouldn't happen if client exists but good practice)
    // The getClientProfileIdFromAuthId service function already throws 403 or 404,
    // but we can add an extra check here or rely on the service error handling.

    // Fetch vehicles using the clientProfileId
    const vehicles = await fetchVehiclesByClientIdAdminService(clientProfileId); // Pass clientProfileId
    res.status(200).json(vehicles);
  } catch (error) {
    console.error(
      `Error in getVehiclesByClientIdAdmin controller (Auth Account ID: ${authAccountId}):`,
      error
    );
    // Pass the service error as is, including status code
    res.status(error.statusCode || 500).json({
      message:
        error.message || `Error fetching vehicles for client ${authAccountId}`,
    });
  }
};

// CLIENT-SPECIFIC VEHICLE FUNCTIONS

// Helper function to get clientProfileId from authAccountId
// This helper was moved to the service file to avoid code duplication
/*
const getClientProfileId = async (authAccountId) => {
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { accountId: authAccountId },
    select: { id: true },
  });
  return clientProfile?.id;
};
*/

// @desc    Get all vehicles for the logged-in client
// @route   GET /api/client/vehicles
// @access  Client
export const getMyVehicles = async (req, res) => {
  try {
    // req.user.id comes from the 'protect' middleware
    const vehicles = await fetchMyVehiclesClientService(req.user.id);
    res.status(200).json(vehicles);
  } catch (error) {
    console.error("Error in getMyVehicles controller:", error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Error fetching client vehicles" });
  }
};

// @desc    Create a new vehicle for the logged-in client
// @route   POST /api/client/vehicles
// @access  Client
export const createMyVehicle = async (req, res) => {
  console.log("--> ENTROU NA FUNÇÃO createMyVehicle NO CONTROLLER <-- ");


  const { brand, model, year, plate, color } = req.body;
  if (!brand || !model || !plate) {
    console.error("Dados de entrada ausentes para veículo (Controller):", {brand, model, plate});
    return res
      .status(400)
      .json({ message: "Brand, model, and plate are required." });
  }
  try {
    console.log("Auth Account ID do usuário logado:", req.user.id);
    const newVehicle = await addNewVehicleClientService(req.user.id, {
      brand,
      model,
      year,
      plate,
      color,
    });
    console.log("Veículo criado com sucesso(Controller):", newVehicle);
    res.status(201).json(newVehicle);
  } catch (error) {
    console.error("Error in createMyVehicle controller:", error);
    console.error("Mensagem de erro:", error.message);
    console.error("Stack do erro:", error.stack);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Error creating client vehicle" });
  }
};

// @desc    Get a specific vehicle by ID for the logged-in client
// @route   GET /api/client/vehicles/:id
// @access  Client
export const getMyVehicleById = async (req, res) => {
  const { id: vehicleId } = req.params;
  try {
    const vehicle = await fetchMyVehicleByIdClientService(
      req.user.id,
      vehicleId
    );
    res.status(200).json(vehicle);
  } catch (error) {
    console.error(
      `Error in getMyVehicleById controller (ID: ${vehicleId}):`,
      error
    );
    res.status(error.statusCode || 500).json({
      message: error.message || "Error fetching client vehicle by ID",
    });
  }
};

// @desc    Update a specific vehicle by ID for the logged-in client
// @route   PUT /api/client/vehicles/:id
// @access  Client
export const updateMyVehicle = async (req, res) => {
  const { id: vehicleId } = req.params;
  const { brand, model, year, plate, color } = req.body;
  // Add any necessary validation for the body payload here
  try {
    const updatedVehicle = await modifyMyVehicleClientService(
      req.user.id,
      vehicleId,
      { brand, model, year, plate, color }
    );
    res.status(200).json(updatedVehicle);
  } catch (error) {
    console.error(
      `Error in updateMyVehicle controller (ID: ${vehicleId}):`,
      error
    );
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Error updating client vehicle" });
  }
};

// @desc    Delete a specific vehicle by ID for the logged-in client
// @route   DELETE /api/client/vehicles/:id
// @access  Client
export const deleteMyVehicle = async (req, res) => {
  const { id: vehicleId } = req.params;
  try {
    const result = await removeMyVehicleClientService(req.user.id, vehicleId);
    res.status(200).json(result);
  } catch (error) {
    console.error(
      `Error in deleteMyVehicle controller (ID: ${vehicleId}):`,
      error
    );
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || "Error deleting client vehicle" });
  }
};
