import express from "express";
import emailCronService from "../services/emailCronService.js";
import emailAutomation from "../services/emailAutomationService.js";
import {
  getAvailableEmailTemplates,
  getEmailSystemSummary,
} from "../services/emailService.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(protect);
router.use(admin);

// ================================
// 📊 ROTAS DE INFORMAÇÕES
// ================================

/**
 * Obter resumo completo do sistema de emails
 * GET /api/admin/email-automation/summary
 */
router.get("/summary", async (req, res) => {
  try {
    const systemSummary = getEmailSystemSummary();
    const cronStatus = emailCronService.getCronJobsStatus();
    const jobConfigs = emailCronService.getJobConfigurations();

    res.json({
      success: true,
      data: {
        system: systemSummary,
        automation: {
          cronJobs: cronStatus,
          configurations: jobConfigs,
        },
        overview: {
          totalTemplates: systemSummary.totalTemplates,
          totalJobs: cronStatus.totalJobs,
          activeJobs: cronStatus.activeJobs,
          categories: systemSummary.categories,
        },
      },
    });
  } catch (error) {
    console.error("Erro ao obter resumo de automação:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

/**
 * Listar todos os templates organizados por categoria
 * GET /api/admin/email-automation/templates
 */
router.get("/templates", async (req, res) => {
  try {
    const templates = getAvailableEmailTemplates();

    const totalTemplates = Object.values(templates).reduce(
      (total, category) => total + category.length,
      0
    );

    res.json({
      success: true,
      message: `${totalTemplates} templates disponíveis`,
      data: {
        totalTemplates,
        categories: Object.keys(templates).length,
        templates,
      },
    });
  } catch (error) {
    console.error("Erro ao listar templates:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

// ================================
// 🕐 ROTAS DE GERENCIAMENTO DE CRON
// ================================

/**
 * Obter status dos cron jobs
 * GET /api/admin/email-automation/cron/status
 */
router.get("/cron/status", async (req, res) => {
  try {
    const status = emailCronService.getCronJobsStatus();
    const configs = emailCronService.getJobConfigurations();

    res.json({
      success: true,
      data: {
        status,
        configurations: configs,
        summary: {
          total: status.totalJobs,
          active: status.activeJobs,
          inactive: status.totalJobs - status.activeJobs,
        },
      },
    });
  } catch (error) {
    console.error("Erro ao obter status dos cron jobs:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

/**
 * Iniciar todos os cron jobs
 * POST /api/admin/email-automation/cron/start
 */
router.post("/cron/start", async (req, res) => {
  try {
    emailCronService.startAllEmailCronJobs();
    const status = emailCronService.getCronJobsStatus();

    res.json({
      success: true,
      message: `${status.activeJobs} jobs de email iniciados`,
      data: status,
    });
  } catch (error) {
    console.error("Erro ao iniciar cron jobs:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao iniciar automação de emails",
    });
  }
});

/**
 * Parar todos os cron jobs
 * POST /api/admin/email-automation/cron/stop
 */
router.post("/cron/stop", async (req, res) => {
  try {
    emailCronService.stopAllEmailCronJobs();
    const status = emailCronService.getCronJobsStatus();

    res.json({
      success: true,
      message: "Todos os jobs de email foram parados",
      data: status,
    });
  } catch (error) {
    console.error("Erro ao parar cron jobs:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao parar automação de emails",
    });
  }
});

/**
 * Testar um cron job específico
 * POST /api/admin/email-automation/cron/test/:jobName
 */
router.post("/cron/test/:jobName", async (req, res) => {
  try {
    const { jobName } = req.params;

    const result = await emailCronService.testCronJob(jobName);

    if (result.success) {
      res.json({
        success: true,
        message: `Teste do job '${jobName}' executado com sucesso`,
        data: result,
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Erro no teste do job '${jobName}'`,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Erro ao testar cron job:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao executar teste",
    });
  }
});

// ================================
// 🎯 ROTAS DE GATILHOS MANUAIS
// ================================

/**
 * Disparar email de boas-vindas manualmente
 * POST /api/admin/email-automation/trigger/welcome
 */
router.post("/trigger/welcome", async (req, res) => {
  try {
    const { email, name, dashboardUrl } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Email e nome são obrigatórios",
      });
    }

    const result = await emailAutomation.onUserRegistered({
      email,
      name,
      dashboardUrl,
    });

    res.json({
      success: true,
      message: "Sequência de boas-vindas disparada",
      data: result,
    });
  } catch (error) {
    console.error("Erro ao disparar boas-vindas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao disparar email de boas-vindas",
    });
  }
});

/**
 * Disparar lembrete de trial manualmente
 * POST /api/admin/email-automation/trigger/trial-reminder
 */
router.post("/trigger/trial-reminder", async (req, res) => {
  try {
    const { tenantId, daysRemaining } = req.body;

    if (!tenantId || !daysRemaining) {
      return res.status(400).json({
        success: false,
        message: "tenantId e daysRemaining são obrigatórios",
      });
    }

    const result = await emailAutomation.onTrialReminder(
      tenantId,
      daysRemaining
    );

    res.json({
      success: true,
      message: `Lembrete de trial (${daysRemaining} dias) enviado`,
      data: result,
    });
  } catch (error) {
    console.error("Erro ao disparar lembrete de trial:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao disparar lembrete de trial",
    });
  }
});

/**
 * Disparar confirmação de agendamento manualmente
 * POST /api/admin/email-automation/trigger/booking-confirmation
 */
router.post("/trigger/booking-confirmation", async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "bookingId é obrigatório",
      });
    }

    const result = await emailAutomation.onBookingCreated(bookingId);

    res.json({
      success: true,
      message: "Confirmação de agendamento enviada",
      data: result,
    });
  } catch (error) {
    console.error("Erro ao disparar confirmação de agendamento:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao disparar confirmação de agendamento",
    });
  }
});

// ================================
// 📈 ROTAS DE ESTATÍSTICAS
// ================================

/**
 * Obter estatísticas de emails enviados
 * GET /api/admin/email-automation/stats
 */
router.get("/stats", async (req, res) => {
  try {
    const { tenantId } = req.query;

    const stats = await emailAutomation.getEmailStats(tenantId);

    res.json({
      success: true,
      data: stats || {
        totalSent: 0,
        byCategory: {},
        deliveryRate: 0,
        openRate: 0,
      },
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter estatísticas de email",
    });
  }
});

/**
 * Obter logs de atividade recente
 * GET /api/admin/email-automation/logs
 */
router.get("/logs", async (req, res) => {
  try {
    const { limit = 50, type } = req.query;

    // Por enquanto, retornamos logs simulados
    // Futuramente pode ser implementado um sistema real de logs
    const logs = [
      {
        id: 1,
        type: "welcome",
        recipient: "usuario@exemplo.com",
        status: "sent",
        timestamp: new Date().toISOString(),
        details: "Email de boas-vindas enviado com sucesso",
      },
      {
        id: 2,
        type: "trial_reminder",
        recipient: "dono@estetica.com",
        status: "sent",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        details: "Lembrete de 7 dias enviado",
      },
      {
        id: 3,
        type: "booking_confirmation",
        recipient: "cliente@exemplo.com",
        status: "delivered",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        details: "Confirmação de agendamento entregue",
      },
    ].slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        logs: type ? logs.filter((log) => log.type === type) : logs,
        total: logs.length,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Erro ao obter logs:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao obter logs de atividade",
    });
  }
});

export default router;
