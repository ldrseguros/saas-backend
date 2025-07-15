import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;

export const registerNewClient = async (clientData) => {
  const { email, password, name, whatsapp, tenantId } = clientData;

  const existingAuthAccount = await prisma.authAccount.findUnique({
    where: {
      email,
      tenantId,
    },
  });

  if (existingAuthAccount) {
    throw new Error("Este email já está registrado para este tenant.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const authAccount = await tx.authAccount.create({
      data: {
        email,
        passwordHash: hashedPassword, 
        role: "CLIENT",
        tenantId,
      },
    });

    const clientProfile = await tx.clientProfile.create({
      data: {
        name,
        whatsapp,
        tenant: {
          connect: {
            id: tenantId
          },
        },
        account:{
          connect:{
            id: authAccount.id,
          }
        }
      },
    });


    return {
      id: authAccount.id,
      email: authAccount.email,
      role: authAccount.role,
      tenantId: authAccount.tenantId,
      profile: clientProfile,
    };
  });

  return result; // Retorna o resultado da transação
};

export const authenticateUser = async (credentials) => {
  const { email, password } = credentials;

  const account = await prisma.authAccount.findUnique({
    where: { email },
    select: {
     id: true,
      email: true,
      role: true,
      tenantId: true,
      passwordHash: true, 
      employee: true, 
      client: true,  
    }
  });

  if (!account) {
    const error = new Error("Email ou senha inválidos.");
    error.statusCode = 401; // Unauthorized
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, account.passwordHash);
  if (!isPasswordValid) {
    const error = new Error("Email ou senha inválidos.");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      id: account.id,
      email: account.email,
      role: account.role,
      tenantId: account.tenantId,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  let userName = "";
  if (account.role === "CLIENT" && account.client) {
    userName = account.client.name;
  } else if (account.employee) {
    userName = account.employee.name;
  }

  return {
    token,
    user: {
      id: account.id,
      email: account.email,
      name: userName,
      role: account.role,
      tenantId: account.tenantId,
    },
  };
};

export const registerNewEmployee = async (employeeData) => {
  const { email, password, name, role } = employeeData;

  if (!["TENANT_ADMIN", "EMPLOYEE"].includes(role)) {
    const error = new Error("Role inválido.");
    error.statusCode = 400; // Bad Request
    throw error;
  }

  const existingAccount = await prisma.authAccount.findUnique({
    where: { email },
  });
  if (existingAccount) {
    const error = new Error("Conta já existe.");
    error.statusCode = 409; // Conflict
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const account = await prisma.authAccount.create({
    data: {
      email,
      passwordHash: hashedPassword,
      role,
      employee: { create: { name } },
    },
    include: { employee: true },
  });

  return account.employee;
};
