import cron from "node-cron";
import emailAutomation from "./emailAutomationService.js";

// ================================
// 🕐 SERVIÇO DE CRON JOBS PARA EMAILS
// ================================

let cronJobs = {};

/**
 * 🚀 Inicializar todos os cron jobs de email
 */
export const initializeEmailCronJobs = () => {
  console.log("📧 [CRON] Inicializando jobs de email automático...");

  // ===== JOB 1: Verificar trials expirando (diário às 9h) =====
  cronJobs.trialCheck = cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("📧 [CRON] Executando verificação de trials...");
      try {
        const result = await emailAutomation.checkTrialsExpiring();
        console.log("📧 [CRON] Verificação de trials concluída:", result);
      } catch (error) {
        console.error("📧 [CRON] Erro na verificação de trials:", error);
      }
    },
    {
      scheduled: false,
      timezone: "America/Sao_Paulo",
    }
  );

  // ===== JOB 2: Lembretes de agendamento (diário às 18h) =====
  cronJobs.bookingReminders = cron.schedule(
    "0 18 * * *",
    async () => {
      console.log("📧 [CRON] Executando lembretes de agendamento...");
      try {
        const result = await emailAutomation.checkBookingReminders();
        console.log("📧 [CRON] Lembretes de agendamento enviados:", result);
      } catch (error) {
        console.error("📧 [CRON] Erro nos lembretes de agendamento:", error);
      }
    },
    {
      scheduled: false,
      timezone: "America/Sao_Paulo",
    }
  );

  // ===== JOB 3: Aniversários (diário às 8h) =====
  cronJobs.birthdays = cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("📧 [CRON] Verificando aniversários do dia...");
      try {
        const result = await emailAutomation.checkClientBirthdays();
        console.log("📧 [CRON] Emails de aniversário enviados:", result);
      } catch (error) {
        console.error("📧 [CRON] Erro nos emails de aniversário:", error);
      }
    },
    {
      scheduled: false,
      timezone: "America/Sao_Paulo",
    }
  );

  // ===== JOB 4: Verificar fidelidade (semanal, domingos às 10h) =====
  cronJobs.loyaltyCheck = cron.schedule(
    "0 10 * * 0",
    async () => {
      console.log("📧 [CRON] Verificando marcos de fidelidade...");
      try {
        const result = await checkLoyaltyMilestones();
        console.log("📧 [CRON] Verificação de fidelidade concluída:", result);
      } catch (error) {
        console.error("📧 [CRON] Erro na verificação de fidelidade:", error);
      }
    },
    {
      scheduled: false,
      timezone: "America/Sao_Paulo",
    }
  );

  // ===== JOB 5: Relatório semanal (segundas às 6h) =====
  cronJobs.weeklyReport = cron.schedule(
    "0 6 * * 1",
    async () => {
      console.log("📧 [CRON] Gerando relatórios semanais...");
      try {
        const result = await generateWeeklyReports();
        console.log("📧 [CRON] Relatórios semanais enviados:", result);
      } catch (error) {
        console.error("📧 [CRON] Erro nos relatórios semanais:", error);
      }
    },
    {
      scheduled: false,
      timezone: "America/Sao_Paulo",
    }
  );

  console.log("📧 [CRON] Jobs de email configurados (ainda não iniciados)");
  return cronJobs;
};

/**
 * 🎯 Iniciar todos os cron jobs
 */
export const startAllEmailCronJobs = () => {
  console.log("📧 [CRON] Iniciando todos os jobs de email...");

  Object.keys(cronJobs).forEach((jobName) => {
    cronJobs[jobName].start();
    console.log(`📧 [CRON] ✅ Job ${jobName} iniciado`);
  });

  console.log("📧 [CRON] Todos os jobs de email estão ativos!");
};

/**
 * ⏹️ Parar todos os cron jobs
 */
export const stopAllEmailCronJobs = () => {
  console.log("📧 [CRON] Parando todos os jobs de email...");

  Object.keys(cronJobs).forEach((jobName) => {
    cronJobs[jobName].stop();
    console.log(`📧 [CRON] ❌ Job ${jobName} parado`);
  });

  console.log("📧 [CRON] Todos os jobs de email foram parados!");
};

/**
 * 📊 Obter status dos cron jobs
 */
export const getCronJobsStatus = () => {
  const status = {};

  Object.keys(cronJobs).forEach((jobName) => {
    status[jobName] = {
      running: cronJobs[jobName].running || false,
      scheduled: cronJobs[jobName].scheduled || false,
      nextRun: cronJobs[jobName].nextDate
        ? cronJobs[jobName].nextDate().format()
        : null,
    };
  });

  return {
    totalJobs: Object.keys(cronJobs).length,
    activeJobs: Object.values(status).filter((job) => job.running).length,
    jobs: status,
  };
};

// ================================
// 🔧 FUNÇÕES AUXILIARES
// ================================

/**
 * Verificar marcos de fidelidade para todos os clientes
 */
const checkLoyaltyMilestones = async () => {
  try {
    // Implementar lógica para verificar quantos serviços cada cliente completou
    // e disparar emails de recompensa quando atingir marcos (5, 10, 20 serviços)

    // Por enquanto, apenas log
    console.log("📧 [CRON] Verificação de fidelidade ainda não implementada");
    return { success: true, checked: 0 };
  } catch (error) {
    console.error("Erro na verificação de fidelidade:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Gerar relatórios semanais para donos de estéticas
 */
const generateWeeklyReports = async () => {
  try {
    // Implementar lógica para gerar relatórios semanais
    // (agendamentos, receita, novos clientes, etc.)

    console.log("📧 [CRON] Relatórios semanais ainda não implementados");
    return { success: true, reportsSent: 0 };
  } catch (error) {
    console.error("Erro na geração de relatórios:", error);
    return { success: false, error: error.message };
  }
};

/**
 * 🧪 Testar um cron job específico
 */
export const testCronJob = async (jobName) => {
  console.log(`📧 [CRON] Testando job: ${jobName}`);

  try {
    switch (jobName) {
      case "trialCheck":
        return await emailAutomation.checkTrialsExpiring();

      case "bookingReminders":
        return await emailAutomation.checkBookingReminders();

      case "birthdays":
        return await emailAutomation.checkClientBirthdays();

      case "loyaltyCheck":
        return await checkLoyaltyMilestones();

      case "weeklyReport":
        return await generateWeeklyReports();

      default:
        throw new Error(`Job ${jobName} não encontrado`);
    }
  } catch (error) {
    console.error(`📧 [CRON] Erro no teste do job ${jobName}:`, error);
    return { success: false, error: error.message };
  }
};

// ================================
// 📋 CONFIGURAÇÕES DOS JOBS
// ================================

export const getJobConfigurations = () => {
  return [
    {
      name: "trialCheck",
      description: "Verificar trials expirando (7 dias, 1 dia, expirados)",
      schedule: "0 9 * * *", // Diário às 9h
      timezone: "America/Sao_Paulo",
      type: "B2B",
      target: "Donos de estéticas",
    },
    {
      name: "bookingReminders",
      description: "Enviar lembretes de agendamento (1 dia antes)",
      schedule: "0 18 * * *", // Diário às 18h
      timezone: "America/Sao_Paulo",
      type: "B2C",
      target: "Clientes finais",
    },
    {
      name: "birthdays",
      description: "Enviar descontos de aniversário",
      schedule: "0 8 * * *", // Diário às 8h
      timezone: "America/Sao_Paulo",
      type: "B2C",
      target: "Clientes finais",
    },
    {
      name: "loyaltyCheck",
      description: "Verificar marcos de fidelidade (5, 10, 20 serviços)",
      schedule: "0 10 * * 0", // Domingos às 10h
      timezone: "America/Sao_Paulo",
      type: "B2C",
      target: "Clientes finais",
    },
    {
      name: "weeklyReport",
      description: "Relatório semanal de performance",
      schedule: "0 6 * * 1", // Segundas às 6h
      timezone: "America/Sao_Paulo",
      type: "B2B",
      target: "Donos de estéticas",
    },
  ];
};

// ================================
// 🚀 AUTO-INICIALIZAÇÃO
// ================================

// Inicializar jobs na importação do módulo
const jobs = initializeEmailCronJobs();

export default {
  initializeEmailCronJobs,
  startAllEmailCronJobs,
  stopAllEmailCronJobs,
  getCronJobsStatus,
  testCronJob,
  getJobConfigurations,
  jobs: cronJobs,
};
