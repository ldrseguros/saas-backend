import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireSuperAdmin } from "../middlewares/tenantMiddleware.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import jwt from "jsonwebtoken";

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
 * Listar planos de assinatura ativos para admins de tenant
 * GET /api/admin/subscription-plans (sem prefixo, será /api/admin/subscription-plans/)
 */
router.get(
  "/",
  protect,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          billingCycle: true,
          features: true,
          maxEmployees: true,
          maxClients: true,
        },
        orderBy: { price: "asc" },
      });

      res.json(plans);
    } catch (error) {
      console.error("Erro ao buscar planos:", error);
      res.status(500).json({ message: "Erro ao buscar planos de assinatura" });
    }
  }
);

/**
 * Listar todos os planos de assinatura (ativos e inativos) - SUPERADMIN
 * GET /api/superadmin/subscriptions/plans
 */
router.get("/plans", async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: "asc" },
    });

    res.json(plans);
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    res.status(500).json({ message: "Erro ao buscar planos de assinatura" });
  }
});

/**
 * Obter detalhes de um plano específico
 * GET /api/superadmin/subscriptions/plans/:id
 */
router.get("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      return res.status(404).json({ message: "Plano não encontrado" });
    }

    res.json(plan);
  } catch (error) {
    console.error("Erro ao buscar plano:", error);
    res.status(500).json({ message: "Erro ao buscar detalhes do plano" });
  }
});

/**
 * Criar um novo plano de assinatura
 * POST /api/superadmin/subscriptions/plans
 */
router.post("/plans", async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      billingCycle,
      features,
      maxEmployees,
      maxClients,
      isActive,
    } = req.body;

    // Verificar se já existe um plano com o mesmo nome
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { name },
    });

    if (existingPlan) {
      return res
        .status(400)
        .json({ message: "Já existe um plano com este nome" });
    }

    // Criar o novo plano
    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        billingCycle,
        features: Array.isArray(features) ? features : [],
        maxEmployees: parseInt(maxEmployees) || 1,
        maxClients: maxClients ? parseInt(maxClients) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json(newPlan);
  } catch (error) {
    console.error("Erro ao criar plano:", error);
    res.status(500).json({ message: "Erro ao criar plano de assinatura" });
  }
});

/**
 * Atualizar um plano de assinatura existente
 * PUT /api/superadmin/subscriptions/plans/:id
 */
router.put("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      billingCycle,
      features,
      maxEmployees,
      maxClients,
      isActive,
    } = req.body;

    // Verificar se o plano existe
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return res.status(404).json({ message: "Plano não encontrado" });
    }

    // Verificar se outro plano já usa o nome (se estiver sendo alterado)
    if (name !== existingPlan.name) {
      const planWithSameName = await prisma.subscriptionPlan.findUnique({
        where: { name },
      });

      if (planWithSameName) {
        return res
          .status(400)
          .json({ message: "Já existe outro plano com este nome" });
      }
    }

    // Atualizar o plano
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name,
        description,
        price: parseFloat(price),
        billingCycle,
        features: Array.isArray(features) ? features : existingPlan.features,
        maxEmployees:
          maxEmployees !== undefined
            ? parseInt(maxEmployees)
            : existingPlan.maxEmployees,
        maxClients:
          maxClients !== undefined
            ? maxClients === null
              ? null
              : parseInt(maxClients)
            : existingPlan.maxClients,
        isActive: isActive !== undefined ? isActive : existingPlan.isActive,
      },
    });

    res.json(updatedPlan);
  } catch (error) {
    console.error("Erro ao atualizar plano:", error);
    res.status(500).json({ message: "Erro ao atualizar plano de assinatura" });
  }
});

/**
 * Listar todas as assinaturas
 * GET /api/superadmin/subscriptions
 */
router.get("/", async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Filtros
    const where = {};
    if (status) {
      where.subscriptionStatus = status;
    }

    // Buscar assinaturas (tenants)
    const subscriptions = await prisma.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        contactEmail: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
        isActive: true,
        subscriptionPlan: {
          select: {
            name: true,
            price: true,
            billingCycle: true,
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
      data: subscriptions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar assinaturas:", error);
    res.status(500).json({ message: "Erro ao listar assinaturas" });
  }
});

/**
 * Obter pagamentos de assinatura
 * GET /api/superadmin/subscriptions/payments
 */
router.get("/payments", async (req, res) => {
  try {
    const {
      tenantId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.paymentDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.paymentDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.paymentDate = {
        lte: new Date(endDate),
      };
    }

    // Buscar pagamentos
    const payments = await prisma.subscriptionPayment.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: { paymentDate: "desc" },
    });

    // Contar total para paginação
    const total = await prisma.subscriptionPayment.count({ where });

    res.json({
      data: payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar pagamentos:", error);
    res
      .status(500)
      .json({ message: "Erro ao listar pagamentos de assinatura" });
  }
});

/**
 * Atualizar status de uma assinatura
 * PATCH /api/superadmin/subscriptions/:tenantId/status
 */
router.patch("/:tenantId/status", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { status, expirationDate } = req.body;

    // Verificar se o tenant existe
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant não encontrado" });
    }

    // Validar o status
    const validStatus = ["ACTIVE", "TRIAL", "PAST_DUE", "CANCELED", "EXPIRED"];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        message: "Status inválido",
        validOptions: validStatus,
      });
    }

    // Atualizar o status da assinatura
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: status,
        subscriptionEndsAt: expirationDate
          ? new Date(expirationDate)
          : undefined,
      },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        subscriptionEndsAt: true,
      },
    });

    // Registrar ação no log de auditoria
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.user.id,
        action: "subscription_status_update",
        description: `Status da assinatura atualizado para ${status} por ${req.user.email}`,
      },
    });

    res.json(updatedTenant);
  } catch (error) {
    console.error("Erro ao atualizar status da assinatura:", error);
    res.status(500).json({ message: "Erro ao atualizar status da assinatura" });
  }
});

export default router;
