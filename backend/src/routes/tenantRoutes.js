import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireSuperAdmin } from "../middlewares/tenantMiddleware.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const router = express.Router();
const prisma = new PrismaClient();

// Middleware para verificar JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: "Token inválido ou expirado" });
      }

      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ message: "Autenticação necessária" });
  }
};

// Aplicar middleware de autenticação e verificação de superadmin em todas as rotas
router.use(authenticateJWT, requireSuperAdmin);

/**
 * Listar todos os tenants (estéticas)
 * GET /api/superadmin/tenants
 */
router.get("/", async (req, res) => {
  try {
    const { name, status, isActive, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where = {};

    if (name) {
      where.name = {
        contains: name,
        mode: "insensitive",
      };
    }

    if (status) {
      where.subscriptionStatus = status;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    // Buscar tenants
    const tenants = await prisma.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        subdomain: true,
        contactEmail: true,
        contactPhone: true,
        isActive: true,
        subscriptionStatus: true,
        subscriptionPlan: {
          select: {
            name: true,
            price: true,
          },
        },
        createdAt: true,
        _count: {
          select: {
            accounts: true,
          },
        },
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
    });

    // Contar total para paginação
    const total = await prisma.tenant.count({ where });

    res.json({
      data: tenants,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar tenants:", error);
    res.status(500).json({ message: "Erro ao listar tenants" });
  }
});

/**
 * Obter detalhes de um tenant específico
 * GET /api/superadmin/tenants/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscriptionPlan: true,
        _count: {
          select: {
            accounts: true,
            services: true,
            bookings: true,
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant não encontrado" });
    }

    res.json(tenant);
  } catch (error) {
    console.error("Erro ao buscar tenant:", error);
    res.status(500).json({ message: "Erro ao buscar detalhes do tenant" });
  }
});

/**
 * Criar um novo tenant com admin
 * POST /api/superadmin/tenants
 */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      subdomain,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      planId,
      adminName,
      adminEmail,
      adminPassword,
      trialDays = 15,
    } = req.body;

    // Verificar se o subdomínio está disponível
    if (subdomain) {
      const existingTenant = await prisma.tenant.findUnique({
        where: { subdomain },
      });

      if (existingTenant) {
        return res
          .status(400)
          .json({ message: "Este subdomínio já está em uso" });
      }
    }

    // Verificar se o plano existe
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return res
        .status(400)
        .json({ message: "Plano de assinatura não encontrado" });
    }

    // Definir data de término do período de trial
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + parseInt(trialDays));

    // Criar o tenant em uma transação junto com o admin
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar o tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          subdomain,
          contactEmail,
          contactPhone,
          address,
          city,
          state,
          zipCode,
          subscriptionStatus: "TRIAL",
          trialEndsAt,
          planId,
        },
      });

      // 2. Criar a conta de admin do tenant
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const adminAccount = await tx.authAccount.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: "TENANT_ADMIN",
          tenantId: tenant.id,
          employee: {
            create: {
              name: adminName,
            },
          },
        },
      });

      // 3. Registrar a ação no log de auditoria
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: req.user.id,
          action: "tenant_created",
          description: `Tenant ${name} criado por ${req.user.email}`,
        },
      });

      return { tenant, adminAccount };
    });

    res.status(201).json({
      id: result.tenant.id,
      name: result.tenant.name,
      subdomain: result.tenant.subdomain,
      subscriptionStatus: result.tenant.subscriptionStatus,
      trialEndsAt: result.tenant.trialEndsAt,
      admin: {
        id: result.adminAccount.id,
        email: result.adminAccount.email,
      },
      message: "Tenant criado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao criar tenant:", error);
    res.status(500).json({ message: "Erro ao criar tenant" });
  }
});

/**
 * Atualizar um tenant existente
 * PUT /api/superadmin/tenants/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      subdomain,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      isActive,
      planId,
      primaryColor,
      secondaryColor,
    } = req.body;

    // Verificar se o tenant existe
    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant não encontrado" });
    }

    // Verificar se o subdomínio está disponível (se estiver sendo alterado)
    if (subdomain && subdomain !== tenant.subdomain) {
      const existingTenant = await prisma.tenant.findUnique({
        where: { subdomain },
      });

      if (existingTenant) {
        return res
          .status(400)
          .json({ message: "Este subdomínio já está em uso" });
      }
    }

    // Verificar se o plano existe (se estiver sendo alterado)
    if (planId && planId !== tenant.planId) {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        return res
          .status(400)
          .json({ message: "Plano de assinatura não encontrado" });
      }
    }

    // Atualizar o tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: {
        name,
        subdomain,
        contactEmail,
        contactPhone,
        address,
        city,
        state,
        zipCode,
        isActive: isActive !== undefined ? isActive : tenant.isActive,
        planId: planId || tenant.planId,
        primaryColor,
        secondaryColor,
      },
    });

    // Registrar a ação no log de auditoria
    await prisma.auditLog.create({
      data: {
        tenantId: id,
        userId: req.user.id,
        action: "tenant_updated",
        description: `Tenant ${name} atualizado por ${req.user.email}`,
      },
    });

    res.json(updatedTenant);
  } catch (error) {
    console.error("Erro ao atualizar tenant:", error);
    res.status(500).json({ message: "Erro ao atualizar tenant" });
  }
});

/**
 * Listar usuários de um tenant
 * GET /api/superadmin/tenants/:id/users
 */
router.get("/:id/users", async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o tenant existe
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant não encontrado" });
    }

    // Buscar usuários do tenant
    const users = await prisma.authAccount.findMany({
      where: {
        tenantId: id,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        employee: {
          select: {
            name: true,
            phone: true,
          },
        },
        client: {
          select: {
            name: true,
            whatsapp: true,
          },
        },
      },
    });

    res.json(users);
  } catch (error) {
    console.error("Erro ao listar usuários do tenant:", error);
    res.status(500).json({ message: "Erro ao listar usuários do tenant" });
  }
});

export default router;
