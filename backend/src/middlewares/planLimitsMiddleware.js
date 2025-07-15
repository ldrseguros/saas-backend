import prisma from "../lib/prisma.js";

/**
 * Middleware para verificar limites do plano de assinatura
 */
export const checkEmployeeLimit = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: "Tenant não identificado" });
    }

    // Buscar plano com detalhes dos limites
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant.id },
      include: {
        subscriptionPlan: true,
        accounts: {
          where: {
            role: { in: ["TENANT_ADMIN", "EMPLOYEE"] },
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant não encontrado" });
    }

    // Verificar limite de funcionários
    const currentEmployeeCount = tenant.accounts.length;
    const maxEmployees = tenant.subscriptionPlan.maxEmployees;

    if (currentEmployeeCount >= maxEmployees) {
      return res.status(403).json({
        message: `Limite de funcionários atingido. Seu plano ${tenant.subscriptionPlan.name} permite apenas ${maxEmployees} funcionário(s). Faça upgrade para adicionar mais funcionários.`,
        currentCount: currentEmployeeCount,
        limit: maxEmployees,
        planName: tenant.subscriptionPlan.name,
      });
    }

    req.planLimits = {
      maxEmployees,
      currentEmployeeCount,
      canAddEmployee: true,
    };

    next();
  } catch (error) {
    console.error("Erro ao verificar limite de funcionários:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const checkClientLimit = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: "Tenant não identificado" });
    }

    // Buscar plano com detalhes dos limites
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant.id },
      include: {
        subscriptionPlan: true,
        accounts: {
          where: {
            role: "CLIENT",
          },
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant não encontrado" });
    }

    // Verificar limite de clientes (se não for ilimitado)
    const currentClientCount = tenant.accounts.length;
    const maxClients = tenant.subscriptionPlan.maxClients;

    if (maxClients !== null && currentClientCount >= maxClients) {
      return res.status(403).json({
        message: `Limite de clientes atingido. Seu plano ${tenant.subscriptionPlan.name} permite apenas ${maxClients} cliente(s). Faça upgrade para adicionar mais clientes.`,
        currentCount: currentClientCount,
        limit: maxClients,
        planName: tenant.subscriptionPlan.name,
      });
    }

    req.planLimits = {
      maxClients,
      currentClientCount,
      canAddClient: true,
    };

    next();
  } catch (error) {
    console.error("Erro ao verificar limite de clientes:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const getPlanLimitsInfo = async (req, res, next) => {
  try {
    if (!req.tenant) {
      return res.status(400).json({ message: "Tenant não identificado" });
    }

    // Buscar informações completas do plano e uso atual
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenant.id },
      include: {
        subscriptionPlan: true,
        accounts: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant não encontrado" });
    }

    const employees = tenant.accounts.filter(
      (account) =>
        account.role === "TENANT_ADMIN" || account.role === "EMPLOYEE"
    );
    const clients = tenant.accounts.filter(
      (account) => account.role === "CLIENT"
    );

    req.planLimits = {
      plan: tenant.subscriptionPlan,
      usage: {
        employees: {
          current: employees.length,
          limit: tenant.subscriptionPlan.maxEmployees,
          canAdd: employees.length < tenant.subscriptionPlan.maxEmployees,
        },
        clients: {
          current: clients.length,
          limit: tenant.subscriptionPlan.maxClients,
          canAdd:
            tenant.subscriptionPlan.maxClients === null ||
            clients.length < tenant.subscriptionPlan.maxClients,
        },
      },
    };

    next();
  } catch (error) {
    console.error("Erro ao obter informações do plano:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
