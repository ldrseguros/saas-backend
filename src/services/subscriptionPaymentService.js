import prisma from "../lib/prisma.js";

/**
 * Buscar histórico de pagamentos de um tenant
 * @param {string} tenantId - ID do tenant
 * @param {Object} options - Opções de paginação e filtros
 * @returns {Promise<Object>} Histórico de pagamentos
 */
export const getPaymentHistory = async (tenantId, options = {}) => {
  try {
    const { page = 1, limit = 10, status } = options;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(status && { status }),
    };

    const [payments, total] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        orderBy: { paymentDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.subscriptionPayment.count({ where }),
    ]);

    // Enriquecer os pagamentos com informações do plano
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        const plan = await prisma.subscriptionPlan.findUnique({
          where: { id: payment.planId },
          select: { name: true, billingCycle: true },
        });

        return {
          ...payment,
          planName: plan?.name || "Plano Desconhecido",
          billingCycle: plan?.billingCycle || "monthly",
        };
      })
    );

    return {
      payments: enrichedPayments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  } catch (error) {
    console.error("Erro ao buscar histórico de pagamentos:", error);
    throw new Error("Erro ao buscar histórico de pagamentos");
  }
};

/**
 * Criar um novo registro de pagamento
 * @param {Object} paymentData - Dados do pagamento
 * @returns {Promise<Object>} Pagamento criado
 */
export const createPayment = async (paymentData) => {
  try {
    const {
      tenantId,
      planId,
      amount,
      status = "completed",
      paymentMethod = "credit_card",
      transactionId,
      nextBillingDate,
    } = paymentData;

    const payment = await prisma.subscriptionPayment.create({
      data: {
        tenantId,
        planId,
        amount,
        status,
        paymentMethod,
        transactionId,
        nextBillingDate,
      },
    });

    return payment;
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    throw new Error("Erro ao criar registro de pagamento");
  }
};

/**
 * Atualizar status de um pagamento
 * @param {string} paymentId - ID do pagamento
 * @param {string} status - Novo status
 * @returns {Promise<Object>} Pagamento atualizado
 */
export const updatePaymentStatus = async (paymentId, status) => {
  try {
    const payment = await prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: { status },
    });

    return payment;
  } catch (error) {
    console.error("Erro ao atualizar status do pagamento:", error);
    throw new Error("Erro ao atualizar status do pagamento");
  }
};

/**
 * Buscar estatísticas de pagamentos de um tenant
 * @param {string} tenantId - ID do tenant
 * @returns {Promise<Object>} Estatísticas de pagamentos
 */
export const getPaymentStats = async (tenantId) => {
  try {
    const [totalPayments, successfulPayments, failedPayments, totalRevenue] =
      await Promise.all([
        prisma.subscriptionPayment.count({
          where: { tenantId },
        }),
        prisma.subscriptionPayment.count({
          where: { tenantId, status: "completed" },
        }),
        prisma.subscriptionPayment.count({
          where: { tenantId, status: "failed" },
        }),
        prisma.subscriptionPayment.aggregate({
          where: { tenantId, status: "completed" },
          _sum: { amount: true },
        }),
      ]);

    return {
      totalPayments,
      successfulPayments,
      failedPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      successRate:
        totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas de pagamentos:", error);
    throw new Error("Erro ao buscar estatísticas de pagamentos");
  }
};

/**
 * Buscar último pagamento de um tenant
 * @param {string} tenantId - ID do tenant
 * @returns {Promise<Object|null>} Último pagamento
 */
export const getLastPayment = async (tenantId) => {
  try {
    const lastPayment = await prisma.subscriptionPayment.findFirst({
      where: { tenantId },
      orderBy: { paymentDate: "desc" },
    });

    return lastPayment;
  } catch (error) {
    console.error("Erro ao buscar último pagamento:", error);
    throw new Error("Erro ao buscar último pagamento");
  }
};

/**
 * Buscar próximo vencimento de um tenant
 * @param {string} tenantId - ID do tenant
 * @returns {Promise<Date|null>} Data do próximo vencimento
 */
export const getNextBillingDate = async (tenantId) => {
  try {
    const lastPayment = await prisma.subscriptionPayment.findFirst({
      where: {
        tenantId,
        status: "completed",
        nextBillingDate: { not: null },
      },
      orderBy: { paymentDate: "desc" },
    });

    return lastPayment?.nextBillingDate || null;
  } catch (error) {
    console.error("Erro ao buscar próximo vencimento:", error);
    throw new Error("Erro ao buscar próximo vencimento");
  }
};

/**
 * Buscar limites do plano atual do tenant
 * @param {string} tenantId - ID do tenant
 * @returns {Promise<Object>} Limites e uso atual
 */
export const getPlanLimits = async (tenantId) => {
  try {
    // Buscar tenant com plano
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptionPlan: true,
        accounts: {
          where: {
            role: { in: ["EMPLOYEE", "TENANT_ADMIN"] },
          },
        },
      },
    });

    if (!tenant) {
      throw new Error("Tenant não encontrado");
    }

    // Contar clientes
    const clientCount = await prisma.authAccount.count({
      where: {
        tenantId,
        role: "CLIENT",
      },
    });

    const employeeCount = tenant.accounts.length;
    const plan = tenant.subscriptionPlan;

    return {
      employees: {
        current: employeeCount,
        limit: plan.maxEmployees,
        canAdd: employeeCount < plan.maxEmployees,
      },
      clients: {
        current: clientCount,
        limit: plan.maxClients,
        canAdd: plan.maxClients === null || clientCount < plan.maxClients,
      },
    };
  } catch (error) {
    console.error("Erro ao buscar limites do plano:", error);
    throw new Error("Erro ao buscar limites do plano");
  }
};
