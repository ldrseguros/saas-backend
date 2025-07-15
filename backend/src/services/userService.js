import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const transformAccountToUser = (account) => {
  if (!account) return null;
  return {
    id: account.id,
    email: account.email,
    role: account.role,
    name: account.employee?.name || account.client?.name || "Sem nome",
    whatsapp: account.client?.whatsapp,
    phone: account.employee?.phone,
    position: account.employee?.position,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
};

export const createNewUser = async (userData) => {
  const { email, name, role, password, phone, position, whatsapp, tenantId } =
    userData;

  // Verificar se o email já está em uso
  const existingAccount = await prisma.authAccount.findUnique({
    where: { email },
  });

  if (existingAccount) {
    const error = new Error("Este email já está em uso");
    error.statusCode = 400;
    throw error;
  }

  // Hash da senha
  const hashedPassword = await bcrypt.hash(password, 10);

  // Criar conta e perfil em transação
  return await prisma.$transaction(async (tx) => {
    const account = await tx.authAccount.create({
      data: {
        email,
        password: hashedPassword,
        role,
        tenantId,
      },
    });

    if (role === "CLIENT") {
      await tx.clientProfile.create({
        data: {
          accountId: account.id,
          name,
          whatsapp: whatsapp || null,
        },
      });
    } else if (["TENANT_ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(role)) {
      await tx.employeeProfile.create({
        data: {
          accountId: account.id,
          name,
          phone: phone || null,
          position: position || null,
        },
      });
    }

    // Buscar o usuário criado com os perfis
    const createdAccount = await tx.authAccount.findUnique({
      where: { id: account.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        employee: { select: { name: true, phone: true, position: true } },
        client: { select: { name: true, whatsapp: true } },
      },
    });

    return transformAccountToUser(createdAccount);
  });
};

export const fetchAllUsers = async (filters, pagination) => {
  const { email, role, tenantId } = filters;
  const { page = 1, limit = 10 } = pagination;

  const whereCondition = {};
  if (email) {
    whereCondition.email = { contains: email, mode: "insensitive" };
  }
  if (role) {
    whereCondition.role = Array.isArray(role) ? { in: role } : role;
  }
  if (tenantId) {
    whereCondition.tenantId = tenantId; // Filtrar por tenant
  }

  const offset = (Number(page) - 1) * Number(limit);

  const accounts = await prisma.authAccount.findMany({
    where: whereCondition,
    skip: offset,
    take: Number(limit),
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      employee: { select: { name: true, phone: true, position: true } },
      client: { select: { name: true, whatsapp: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalUsers = await prisma.authAccount.count({
    where: whereCondition,
  });

  const users = accounts.map(transformAccountToUser);

  return {
    users,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalUsers / Number(limit)),
      totalUsers,
    },
  };
};

export const fetchUserById = async (id) => {
  const account = await prisma.authAccount.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      employee: { select: { name: true, phone: true, position: true } },
      client: { select: { name: true, whatsapp: true } },
    },
  });

  if (!account) {
    const error = new Error("Usuário não encontrado");
    error.statusCode = 404;
    throw error;
  }
  return transformAccountToUser(account);
};

export const modifyUser = async (id, userData) => {
  const { email, name, role, password, whatsapp, phone, position } = userData;

  const accountToUpdate = await prisma.authAccount.findUnique({
    where: { id },
  });
  if (!accountToUpdate) {
    const error = new Error("Usuário não encontrado para atualização.");
    error.statusCode = 404;
    throw error;
  }

  const updateData = { email, role };
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }

  // Start a transaction to update account and profile together
  return await prisma.$transaction(async (tx) => {
    await tx.authAccount.update({
      where: { id },
      data: updateData,
    });

    // Determine which profile to update based on role
    if (role === "CLIENT") {
      // If role changes to CLIENT or is CLIENT and name/whatsapp changes
      await tx.clientProfile.upsert({
        where: { accountId: id },
        update: {
          name,
          whatsapp: whatsapp !== undefined ? whatsapp : null,
        },
        create: {
          accountId: id,
          name,
          whatsapp: whatsapp !== undefined ? whatsapp : null,
        },
      });
      // Remove employee profile if exists
      await tx.employeeProfile.deleteMany({ where: { accountId: id } });
    } else if (["TENANT_ADMIN", "EMPLOYEE", "SUPER_ADMIN"].includes(role)) {
      // If role changes to TENANT_ADMIN/EMPLOYEE/SUPER_ADMIN or is any of these roles and name changes
      await tx.employeeProfile.upsert({
        where: { accountId: id },
        update: {
          name,
          phone: phone !== undefined ? phone : null,
          position: position !== undefined ? position : null,
        },
        create: {
          accountId: id,
          name,
          phone: phone !== undefined ? phone : null,
          position: position !== undefined ? position : null,
        },
      });
      // Remove client profile if exists
      await tx.clientProfile.deleteMany({ where: { accountId: id } });
    }

    // Fetch and return the updated user details
    const updatedAccountWithProfile = await tx.authAccount.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        employee: { select: { name: true, phone: true, position: true } },
        client: { select: { name: true, whatsapp: true } },
      },
    });
    return transformAccountToUser(updatedAccountWithProfile);
  });
};

export const removeUser = async (id) => {
  const accountToDelete = await prisma.authAccount.findUnique({
    where: { id },
  });
  if (!accountToDelete) {
    const error = new Error("Usuário não encontrado para exclusão.");
    error.statusCode = 404;
    throw error;
  }
  // Using a transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // Delete associated profiles first
    // Delete associated records in other tables (e.g., Bookings, Vehicles)
    // Find client profile ID first to delete related records if the account has one
    const clientProfile = await tx.clientProfile.findUnique({
      where: { accountId: id },
      select: { id: true },
    });

    if (clientProfile) {
      // Find all booking IDs associated with this client profile
      const clientBookings = await tx.booking.findMany({
        where: { clientId: clientProfile.id },
        select: { id: true },
      });
      const bookingIds = clientBookings.map((b) => b.id);

      // Delete associated records in BookingService first
      if (bookingIds.length > 0) {
        await tx.bookingService.deleteMany({
          where: { bookingId: { in: bookingIds } },
        });
      }

      // Delete Bookings associated with this client profile
      await tx.booking.deleteMany({
        where: { clientId: clientProfile.id },
      });

      // Delete Vehicles associated with this client profile
      await tx.vehicle.deleteMany({ where: { clientId: clientProfile.id } });
    }

    await tx.employeeProfile.deleteMany({ where: { accountId: id } });
    await tx.clientProfile.deleteMany({ where: { accountId: id } });
    // Then delete the account
    await tx.authAccount.delete({ where: { id } });
    return { message: `User with ID ${id} deleted successfully` }; // Or simply return void/true
  });
};
