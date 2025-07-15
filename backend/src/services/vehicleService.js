import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to get clientProfileId from authAccountId (used internally by client functions)
export const getClientProfileIdFromAuthId = async (authAccountId) => {
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { accountId: authAccountId },
    select: { id: true },
  });
  if (!clientProfile) {
    const error = new Error("Client profile not found for this user.");
    error.statusCode = 403; // Forbidden, as the user's client profile is missing
    throw error;
  }
  return clientProfile.id;
};

// --- ADMIN VEHICLE SERVICES ---

export const fetchAllVehiclesAdmin = async () => {
  return await prisma.vehicle.findMany({
    include: {
      client: {
        select: {
          id: true,
          name: true,
          account: { select: { email: true } },
        },
      },
    },
  });
};

export const addNewVehicleAdmin = async (vehicleData) => {
  const { brand, model, year, plate, color, clientId } = vehicleData;

  const clientExists = await prisma.clientProfile.findUnique({
    where: { id: clientId },
  });
  if (!clientExists) {
    const error = new Error("Client not found to assign vehicle to.");
    error.statusCode = 404;
    throw error;
  }

  try {
    return await prisma.vehicle.create({
      data: {
        brand,
        model,
        year: year ? parseInt(year) : null,
        plate,
        color,
        clientId,
      },
    });
  } catch (e) {
    if (e.code === "P2002" && e.meta?.target?.includes("plate")) {
      const error = new Error("A vehicle with this plate already exists.");
      error.statusCode = 409;
      throw error;
    }
    throw e; // Re-throw other errors
  }
};

export const fetchVehicleByIdAdmin = async (id) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          account: { select: { email: true } },
        },
      },
    },
  });
  if (!vehicle) {
    const error = new Error("Vehicle not found.");
    error.statusCode = 404;
    throw error;
  }
  return vehicle;
};

export const modifyVehicleAdmin = async (id, vehicleData) => {
  const { brand, model, year, plate, color, clientId } = vehicleData;

  const vehicleExists = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicleExists) {
    const error = new Error("Vehicle not found to update.");
    error.statusCode = 404;
    throw error;
  }

  if (clientId) {
    const clientExists = await prisma.clientProfile.findUnique({
      where: { id: clientId },
    });
    if (!clientExists) {
      const error = new Error(
        "Client not found if trying to reassign vehicle."
      );
      error.statusCode = 404;
      throw error;
    }
  }

  try {
    return await prisma.vehicle.update({
      where: { id },
      data: {
        brand,
        model,
        year: year ? parseInt(year) : undefined,
        plate,
        color,
        clientId, // Admin can reassign
      },
    });
  } catch (e) {
    if (e.code === "P2002" && e.meta?.target?.includes("plate")) {
      const error = new Error("A vehicle with this plate already exists.");
      error.statusCode = 409;
      throw error;
    }
    if (e.code === "P2025") {
      // Record to update not found - should be caught by vehicleExists check earlier
      const error = new Error("Vehicle not found for update (P2025).");
      error.statusCode = 404;
      throw error;
    }
    throw e;
  }
};

export const removeVehicleAdmin = async (id) => {
  const vehicleExists = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicleExists) {
    const error = new Error("Vehicle not found to delete.");
    error.statusCode = 404;
    throw error;
  }
  try {
    await prisma.vehicle.delete({ where: { id } });
    return { message: `Vehicle with ID ${id} deleted successfully by admin.` };
  } catch (e) {
    if (e.code === "P2003") {
      // Foreign key constraint (e.g., linked to bookings)
      const error = new Error(
        "Cannot delete vehicle. It might be associated with existing bookings."
      );
      error.statusCode = 409;
      throw error;
    }
    throw e;
  }
};

// Fetch vehicles by client ID (for Admin)
export const fetchVehiclesByClientIdAdmin = async (clientId) => {
  try {
    // Check if the client exists
    const client = await prisma.clientProfile.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      const error = new Error("Client not found.");
      error.statusCode = 404;
      throw error;
    }

    // Find vehicles associated with the given clientId
    const vehicles = await prisma.vehicle.findMany({
      where: {
        clientId: clientId,
      },
      // Include related data if needed (e.g., client details, although probably not necessary for this use case)
    });
    return vehicles;
  } catch (error) {
    console.error(
      `Error in fetchVehiclesByClientIdAdmin service (Client ID: ${clientId}):`,
      error
    );
    const errorObj = new Error(
      error.message || `Failed to fetch vehicles for client ${clientId}` // Use original error message if available
    );
    errorObj.statusCode = error.statusCode || 500; // Preserve original status code if available
    throw errorObj;
  }
};

// --- CLIENT VEHICLE SERVICES ---

export const fetchMyVehiclesClient = async (authAccountId) => {
  const clientProfileId = await getClientProfileIdFromAuthId(authAccountId);
  return await prisma.vehicle.findMany({
    where: { clientId: clientProfileId },
  });
};

export const addNewVehicleClient = async (authAccountId, vehicleData) => {
    const { brand, model, year, plate, color } = vehicleData;

    const clientProfile = await prisma.clientProfile.findUnique({
        where: { accountId: authAccountId },
        select: { id: true, tenantId: true } // Selecione o tenantId diretamente aqui
    });

    if (!clientProfile || !clientProfile.tenantId) {
        const error = new Error("Perfil do cliente ou Tenant ID não encontrado para a conta de autenticação fornecida.");
        error.statusCode = 403; // Ou 404, dependendo da sua regra de negócio
        throw error;
    }

    const clientProfileId = clientProfile.id;
    const tenantId = clientProfile.tenantId;

    try {
        return await prisma.vehicle.create({
            data: {
                brand,
                model,
                year: year ? parseInt(year) : null,
                plate,
                color,
                client: {
                    connect: { id: clientProfileId },
                },
                tenant: { // Já está correto aqui
                    connect : {
                        id: tenantId,
                    },
                },
            },
        });
    } catch (e) {
        console.error("Erro ao adicionar novo veículo para o cliente", e);
        // IMPORTANTE: Adicione o stack trace aqui também
        console.error("Stack Trace do erro no service:", e.stack);
        throw e;
    }
};

export const fetchMyVehicleByIdClient = async (authAccountId, vehicleId) => {
  const clientProfileId = await getClientProfileIdFromAuthId(authAccountId);
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });

  if (!vehicle) {
    const error = new Error("Vehicle not found.");
    error.statusCode = 404;
    throw error;
  }
  if (vehicle.clientId !== clientProfileId) {
    const error = new Error("You are not authorized to view this vehicle.");
    error.statusCode = 403;
    throw error;
  }
  return vehicle;
};

export const modifyMyVehicleClient = async (
  authAccountId,
  vehicleId,
  vehicleData
) => {
  const { brand, model, year, plate, color } = vehicleData;
  const clientProfileId = await getClientProfileIdFromAuthId(authAccountId);

  const vehicleToUpdate = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  });
  if (!vehicleToUpdate) {
    const error = new Error("Vehicle not found to update.");
    error.statusCode = 404;
    throw error;
  }
  if (vehicleToUpdate.clientId !== clientProfileId) {
    const error = new Error("You are not authorized to update this vehicle.");
    error.statusCode = 403;
    throw error;
  }

  try {
    return await prisma.vehicle.update({
      where: { id: vehicleId }, // Ensure we're updating the specific vehicle ID
      data: {
        brand,
        model,
        year: year ? parseInt(year) : undefined,
        plate,
        color,
        // clientId remains the same, client cannot reassign their own vehicle to another client
      },
    });
  } catch (e) {
    if (e.code === "P2002" && e.meta?.target?.includes("plate")) {
      const error = new Error("A vehicle with this plate already exists.");
      error.statusCode = 409;
      throw error;
    }
    if (e.code === "P2025") {
      const error = new Error("Vehicle not found for update (P2025).");
      error.statusCode = 404;
      throw error;
    }
    throw e;
  }
};

export const removeMyVehicleClient = async (authAccountId, vehicleId) => {
  const clientProfileId = await getClientProfileIdFromAuthId(authAccountId);
  const vehicleToDelete = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicleToDelete) {
    const error = new Error("Vehicle not found to delete.");
    error.statusCode = 404;
    throw error;
  }
  if (vehicleToDelete.clientId !== clientProfileId) {
    const error = new Error("You are not authorized to delete this vehicle.");
    error.statusCode = 403;
    throw error;
  }

  try {
    await prisma.vehicle.delete({ where: { id: vehicleId } });
    return {
      message: `Vehicle with ID ${vehicleId} deleted successfully by client.`,
    };
  } catch (e) {
    if (e.code === "P2003") {
      const error = new Error(
        "Cannot delete vehicle. It might be associated with existing bookings."
      );
      error.statusCode = 409;
      throw error;
    }
    throw e;
  }
};
