import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to get clientProfileId from authAccountId (can be centralized if used in many services)
const getClientProfileIdFromAuthId = async (authAccountId) => {
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { accountId: authAccountId },
    select: { id: true },
  });
  if (!clientProfile) {
    const error = new Error("Client profile not found for this user.");
    error.statusCode = 403;
    throw error;
  }
  return clientProfile.id;
};

// --- ADMIN BOOKING SERVICES ---

export const fetchAllBookingsAdmin = async ({
  limit = 50,
  fromDate,
  tenantId,
} = {}) => {
  // Validar se tenantId foi fornecido
  if (!tenantId) {
    const error = new Error("TenantId é obrigatório para buscar agendamentos");
    error.statusCode = 400;
    throw error;
  }

  // Se não passar fromDate, pega últimos 30 dias para mostrar histórico
  const now = new Date();
  const startDate = fromDate
    ? new Date(fromDate)
    : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId: tenantId, // FILTRO POR TENANT
      date: {
        gte: startDate,
      },
    },
    include: {
      client: {
        include: {
          account: true,
        },
      },
      vehicle: true,
      services: {
        include: {
          service: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { time: "desc" }],
    take: limit,
  });

  // Calcular preço total e transformar dados para compatibilidade com frontend
  const transformedBookings = bookings.map((booking) => {
    const totalPrice = booking.services.reduce(
      (total, service) => total + service.service.price,
      0
    );

    // Calcular endTime baseado no startTime e duração dos serviços
    const totalDuration = booking.services.reduce(
      (total, service) => total + (service.service.duration || 60),
      0
    );
    const [hours, minutes] = booking.time.split(":").map(Number);
    const startTimeMinutes = hours * 60 + minutes;
    const endTimeMinutes = startTimeMinutes + totalDuration;
    const endHours = Math.floor(endTimeMinutes / 60);
    const endMins = endTimeMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
      .toString()
      .padStart(2, "0")}`;

    return {
      id: booking.id,
      date: booking.date.toISOString().split("T")[0], // Format: YYYY-MM-DD
      startTime: booking.time,
      endTime: endTime,
      status: booking.status.toLowerCase(),
      totalPrice: totalPrice,
      location: booking.location || "loja",
      address: booking.address,
      notes: booking.specialInstructions,
      client: {
        id: booking.client.id,
        name: booking.client.name,
        email: booking.client.account.email,
        phone: booking.client.phone,
      },
      vehicle: {
        id: booking.vehicle.id,
        brand: booking.vehicle.brand,
        model: booking.vehicle.model,
        year: booking.vehicle.year,
        plate: booking.vehicle.plate,
        color: booking.vehicle.color,
      },
      services: booking.services.map((service) => ({
        id: service.id,
        service: {
          id: service.service.id,
          title: service.service.title,
          price: service.service.price,
          duration: service.service.duration,
        },
      })),
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  });

  return {
    bookings: transformedBookings,
    total: transformedBookings.length,
  };
};

export const addNewBookingAdmin = async (bookingData) => {
  const {
    clientId,
    vehicleId,
    serviceIds,
    date,
    time,
    status = "pending",
    specialInstructions,
    location,
    tenantId,
  } = bookingData;

  // Validar se tenantId foi fornecido
  if (!tenantId) {
    const error = new Error("TenantId é obrigatório para criar agendamento");
    error.statusCode = 400;
    throw error;
  }

  // Verificar se o ID fornecido é um authAccountId ou um clientProfileId
  let clientProfileId = clientId;

  // Primeiro, verificamos se o clientId corresponde a um ClientProfile existente
  const clientProfile = await prisma.clientProfile.findUnique({
    where: { id: clientId },
  });

  // Se não encontrarmos um ClientProfile diretamente, vamos verificar se é um authAccountId
  if (!clientProfile) {
    console.log(
      `ClientProfile não encontrado diretamente com ID ${clientId}, verificando se é um authAccountId...`
    );
    // Tentamos encontrar o ClientProfile pelo authAccountId
    const clientProfileByAuth = await prisma.clientProfile.findUnique({
      where: { accountId: clientId },
      select: { id: true },
    });

    if (!clientProfileByAuth) {
      const error = new Error(
        `Cliente não encontrado para o ID fornecido: ${clientId}`
      );
      error.statusCode = 404;
      throw error;
    }

    clientProfileId = clientProfileByAuth.id;
    console.log(
      `ClientProfile encontrado pelo authAccountId: ${clientProfileId}`
    );
  }

  // Verifica se o veículo pertence ao cliente E ao tenant
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
  });

  if (!vehicle) {
    const error = new Error(`Veículo não encontrado: ${vehicleId}`);
    error.statusCode = 404;
    throw error;
  }

  if (vehicle.clientId !== clientProfileId) {
    const error = new Error(`O veículo não pertence ao cliente especificado`);
    error.statusCode = 403;
    throw error;
  }

  if (vehicle.tenantId !== tenantId) {
    const error = new Error(`O veículo não pertence ao tenant especificado`);
    error.statusCode = 403;
    throw error;
  }

  // Corrigindo o problema de fuso horário: mantendo a data original
  // Formato esperado: YYYY-MM-DD
  const [year, month, day] = date.split("-").map((num) => parseInt(num, 10));
  const bookingDate = new Date(year, month - 1, day, 12, 0, 0);

  console.log(`Data original: ${date}`);
  console.log(`Data convertida para objeto Date: ${bookingDate.toISOString()}`);

  return await prisma.booking.create({
    data: {
      clientId: clientProfileId, // Usa o clientProfileId correto
      vehicleId,
      tenantId, // ADICIONAR TENANT ID
      date: bookingDate,
      time,
      status,
      specialInstructions,
      location,
      services: {
        create: serviceIds.map((serviceId) => ({
          service: { connect: { id: serviceId } },
        })),
      },
    },
    include: {
      client: { include: { account: true } },
      vehicle: true,
      services: { include: { service: true } },
    },
  });
};

export const fetchBookingByIdAdmin = async (id, tenantId) => {
  // Validar se tenantId foi fornecido
  if (!tenantId) {
    const error = new Error("TenantId é obrigatório para buscar agendamento");
    error.statusCode = 400;
    throw error;
  }

  const booking = await prisma.booking.findUnique({
    where: {
      id,
      tenantId, // FILTRO POR TENANT
    },
    include: {
      client: { include: { account: true } },
      vehicle: true,
      services: { include: { service: true } },
    },
  });
  if (!booking) {
    const error = new Error("Booking not found.");
    error.statusCode = 404;
    throw error;
  }
  return booking;
};

export const modifyBookingAdmin = async (id, updates, tenantId) => {
  // Validar se tenantId foi fornecido
  if (!tenantId) {
    const error = new Error(
      "TenantId é obrigatório para modificar agendamento"
    );
    error.statusCode = 400;
    throw error;
  }

  try {
    // Verificar se o booking existe e pertence ao tenant
    const existingBooking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      const error = new Error("Booking not found.");
      error.statusCode = 404;
      throw error;
    }

    if (existingBooking.tenantId !== tenantId) {
      const error = new Error("Booking not found or access denied.");
      error.statusCode = 404;
      throw error;
    }

    // Extract only the allowed fields for update
    const allowedUpdates = {
      date: updates.date ? new Date(updates.date) : undefined,
      time: updates.time,
      status: updates.status,
      specialInstructions: updates.specialInstructions,
      location: updates.location,
    };

    const updatedBooking = await prisma.booking.update({
      where: {
        id,
        tenantId, // FILTRO POR TENANT
      },
      data: allowedUpdates, // Pass only allowed updates
      include: {
        client: { include: { account: true } },
        vehicle: true,
        services: { include: { service: true } },
      },
    });

    return updatedBooking;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An error occurred";
    const errorCode = error instanceof Error ? error.statusCode : 500;
    const errorObj = new Error(errorMessage);
    errorObj.statusCode = errorCode;
    throw errorObj;
  }
};

export const removeBookingAdmin = async (id, tenantId) => {
  // Validar se tenantId foi fornecido
  if (!tenantId) {
    const error = new Error("TenantId é obrigatório para deletar agendamento");
    error.statusCode = 400;
    throw error;
  }

  const existingBooking = await prisma.booking.findUnique({
    where: {
      id,
      tenantId, // FILTRO POR TENANT
    },
  });
  if (!existingBooking) {
    const error = new Error("Booking not found to delete.");
    error.statusCode = 404;
    throw error;
  }
  // Transaction to ensure atomicity if deleting related BookingService entries
  return await prisma.$transaction(async (tx) => {
    await tx.bookingService.deleteMany({ where: { bookingId: id } });
    await tx.booking.delete({
      where: {
        id,
        tenantId, // FILTRO POR TENANT
      },
    });
    return { message: `Booking with ID ${id} deleted successfully by admin.` };
  });
};

// --- CLIENT BOOKING SERVICES ---

export const fetchMyBookingsClient = async (authAccountId) => {
  const clientProfileId = await getClientProfileIdFromAuthId(authAccountId);
  return await prisma.booking.findMany({
    where: { clientId: clientProfileId },
    include: { vehicle: true, services: { include: { service: true } } },
    orderBy: [{ date: "desc" }, { time: "desc" }],
  });
};

export const addNewBookingClient = async (authAccountId, bookingData) => {

  console.log("[addNewBookingClient Service] ---INICIANDO---");

  const {
    vehicleId,
    serviceIds,
    date,
    time,
    status = "pending",
    specialInstructions,
    location,
    phone,
  } = bookingData;

  const clientProfileId = await getClientProfileIdFromAuthId(authAccountId);

  if(!clientProfileId){
    throw new Error("Perfil do cliente não encontrado para a conta de autenticação fornecida.")
  }

  //Obter o tenantId através do AuthAccount
  const authAccount = await prisma.authAccount.findUnique({
    where: {id: authAccountId},
    select: {tenantId: true}
  });

  if(!authAccount || !authAccount.tenantId){
    throw new Error("Tenant ID não encontrado para a conta de autenticação.");
  }

  const tenantId = authAccount.tenantId;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle || vehicle.clientId !== clientProfileId) {
    const error = new Error(
      "Veículo inválido ou veículo não pertence a você."
    );
    error.statusCode = 403;
    throw error;
  }

  // Corrigindo o problema de fuso horário: mantendo a data original
  // Formato esperado: YYYY-MM-DD
  const [year, month, day] = date.split("-").map((num) => parseInt(num, 10));
  const bookingDate = new Date(year, month - 1, day, 12, 0, 0);

  console.log(`Data original do cliente: ${date}`);
  console.log(`Data convertida para objeto Date: ${bookingDate.toISOString()}`);
  
try{
  return await prisma.booking.create({
    data: {
      client:{
        connect: {
          id: clientProfileId,
        },
      },
      vehicle:{
        connect:{
          id: vehicleId,
        },
      },
      date: bookingDate,
      time,
      status,
      specialInstructions,
      location,
      clientPhone: phone,
      services: {
        create: serviceIds.map((serviceId) => ({
          service: { connect: { id: serviceId } },
        })),
      },
      tenant: {
        connect: {
          id: tenantId,
        },
      },
    },
    include: { vehicle: true, services: { include: { service: true } } },
  });
} catch(e){
  console.error("Erro ao criar agendamento no Prisma:",e);
  throw e;
  }
};

export const fetchMyBookingByIdClient = async (authAccountId, bookingId) => {
  const clientProfileId = await getClientProfileIdFromAuthId(authAccountId);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { vehicle: true, services: { include: { service: true } } },
  });

  if (!booking) {
    const error = new Error("Booking not found.");
    error.statusCode = 404;
    throw error;
  }
  if (booking.clientId !== clientProfileId) {
    const error = new Error("You are not authorized to view this booking.");
    error.statusCode = 403;
    throw error;
  }
  return booking;
};

export const cancelMyBookingClient = async (authAccountId, bookingId) => {
  const clientProfileId = await getClientProfileIdFromAuthId(authAccountId);
  const bookingToCancel = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!bookingToCancel) {
    const error = new Error("Booking not found.");
    error.statusCode = 404;
    throw error;
  }
  if (bookingToCancel.clientId !== clientProfileId) {
    const error = new Error("You are not authorized to cancel this booking.");
    error.statusCode = 403;
    throw error;
  }
  if (
    bookingToCancel.status === "completed" ||
    bookingToCancel.status === "cancelled"
  ) {
    const error = new Error(
      `Booking is already ${bookingToCancel.status} and cannot be cancelled.`
    );
    error.statusCode = 400;
    throw error;
  }

  return await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "cancelled" },
    include: { vehicle: true, services: { include: { service: true } } },
  });
};
