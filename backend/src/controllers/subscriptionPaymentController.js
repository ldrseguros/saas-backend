import {
  getPaymentHistory,
  createPayment,
  updatePaymentStatus,
  getPaymentStats,
  getLastPayment,
  getNextBillingDate,
  getPlanLimits,
} from "../services/subscriptionPaymentService.js";

// @desc    Get payment history for tenant
// @route   GET /api/payments/history
// @access  Admin
export const getPaymentHistoryController = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const { page, limit, status } = req.query;
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      status,
    };

    const paymentHistory = await getPaymentHistory(tenantId, options);
    res.status(200).json(paymentHistory);
  } catch (error) {
    console.error("Error in getPaymentHistoryController:", error);
    res.status(500).json({
      message: error.message || "Erro ao buscar histórico de pagamentos",
    });
  }
};

// @desc    Get payment statistics for tenant
// @route   GET /api/payments/stats
// @access  Admin
export const getPaymentStatsController = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const stats = await getPaymentStats(tenantId);
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error in getPaymentStatsController:", error);
    res.status(500).json({
      message: error.message || "Erro ao buscar estatísticas de pagamentos",
    });
  }
};

// @desc    Get last payment for tenant
// @route   GET /api/payments/last
// @access  Admin
export const getLastPaymentController = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const lastPayment = await getLastPayment(tenantId);
    res.status(200).json(lastPayment);
  } catch (error) {
    console.error("Error in getLastPaymentController:", error);
    res.status(500).json({
      message: error.message || "Erro ao buscar último pagamento",
    });
  }
};

// @desc    Get next billing date for tenant
// @route   GET /api/payments/next-billing
// @access  Admin
export const getNextBillingController = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const nextBillingDate = await getNextBillingDate(tenantId);
    res.status(200).json({ nextBillingDate });
  } catch (error) {
    console.error("Error in getNextBillingController:", error);
    res.status(500).json({
      message: error.message || "Erro ao buscar próximo vencimento",
    });
  }
};

// @desc    Create payment record (for webhook or manual creation)
// @route   POST /api/payments/record
// @access  Admin/System
export const createPaymentController = async (req, res) => {
  try {
    const {
      tenantId,
      planId,
      amount,
      status,
      paymentMethod,
      transactionId,
      nextBillingDate,
    } = req.body;

    // Se chamado por usuário normal, usar tenantId do usuário
    const targetTenantId =
      req.user.role === "SUPER_ADMIN" ? tenantId : req.user.tenantId;

    if (!targetTenantId) {
      return res.status(400).json({ message: "TenantId é obrigatório" });
    }

    const paymentData = {
      tenantId: targetTenantId,
      planId,
      amount,
      status,
      paymentMethod,
      transactionId,
      nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : null,
    };

    const payment = await createPayment(paymentData);
    res.status(201).json(payment);
  } catch (error) {
    console.error("Error in createPaymentController:", error);
    res.status(500).json({
      message: error.message || "Erro ao criar registro de pagamento",
    });
  }
};

// @desc    Update payment status
// @route   PATCH /api/payments/:id/status
// @access  Admin/System
export const updatePaymentStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status é obrigatório" });
    }

    const payment = await updatePaymentStatus(id, status);
    res.status(200).json(payment);
  } catch (error) {
    console.error("Error in updatePaymentStatusController:", error);
    res.status(500).json({
      message: error.message || "Erro ao atualizar status do pagamento",
    });
  }
};

// @desc    Get plan limits for tenant
// @route   GET /api/payments/plan-limits
// @access  Admin
export const getPlanLimitsController = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const limits = await getPlanLimits(tenantId);
    res.status(200).json(limits);
  } catch (error) {
    console.error("Error in getPlanLimitsController:", error);
    res.status(500).json({
      message: error.message || "Erro ao buscar limites do plano",
    });
  }
};
