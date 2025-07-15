// ================================
// 📧 SERVIÇO DE EMAIL PRINCIPAL
// ================================
// Este arquivo agora serve como ponte entre os serviços especializados
// e mantém compatibilidade com o código existente

import {
  sendWelcomeEmail,
  sendTutorialFirstSteps,
  sendTrialReminder7Days,
  sendTrialReminder1Day,
  sendTrialExpired,
  sendSubscriptionConfirmation,
  sendPaymentFailed,
  sendInvoiceAvailable,
  sendSubscriptionCancelled,
  sendWinbackOffer,
  testEmailConfiguration,
  sendTestEmail,
} from "./saasEmailService.js";

import {
  sendBookingConfirmation,
  sendBookingReminder,
  sendServiceCompleted,
  sendLoyaltyReward,
  sendBirthdayDiscount,
  getBusinessEmailTemplates,
} from "./businessEmailService.js";

// ================================
// 📋 FUNÇÃO PARA OBTER TODOS OS TEMPLATES
// ================================

// Função para obter lista de todos os templates disponíveis organizados
export const getAvailableEmailTemplates = () => {
  const businessTemplates = getBusinessEmailTemplates();

  return {
    // B2B - SaaS para donos das estéticas
    saas_onboarding: [
      {
        key: "welcomeEmail",
        name: "🎉 Email de Boas-vindas",
        description: "Enviado quando um novo dono se cadastra",
      },
      {
        key: "tutorialFirstSteps",
        name: "📖 Tutorial de Primeiros Passos",
        description: "Guia de configuração da plataforma",
      },
    ],
    saas_trial: [
      {
        key: "trialReminder7Days",
        name: "⏰ Lembrete 7 dias restantes",
        description: "Enviado 7 dias antes do trial expirar",
      },
      {
        key: "trialReminder1Day",
        name: "🚨 Último dia do trial",
        description: "Enviado no último dia do trial",
      },
      {
        key: "trialExpired",
        name: "❌ Trial expirado",
        description: "Enviado quando o trial expira",
      },
    ],
    saas_payment: [
      {
        key: "subscriptionConfirmation",
        name: "✅ Assinatura confirmada",
        description: "Enviado quando assinatura é ativada",
      },
      {
        key: "paymentFailed",
        name: "❌ Falha no pagamento",
        description: "Enviado quando pagamento falha",
      },
      {
        key: "invoiceAvailable",
        name: "📄 Fatura disponível",
        description: "Enviado quando nova fatura é gerada",
      },
    ],
    saas_cancellation: [
      {
        key: "subscriptionCancelled",
        name: "❌ Assinatura cancelada",
        description: "Enviado quando assinatura é cancelada",
      },
      {
        key: "winbackOffer",
        name: "🎁 Oferta de retorno",
        description: "Enviado para tentar reconquistar cliente",
      },
    ],

    // B2C - Estéticas para clientes finais
    ...businessTemplates,
  };
};

// ================================
// 🔄 RE-EXPORTAÇÃO PARA COMPATIBILIDADE
// ================================

// Re-exportar funções para manter compatibilidade com código existente
export {
  // SaaS (B2B)
  sendWelcomeEmail,
  sendTutorialFirstSteps,
  sendTrialReminder7Days,
  sendTrialReminder1Day,
  sendTrialExpired,
  sendSubscriptionConfirmation,
  sendPaymentFailed,
  sendInvoiceAvailable,
  sendSubscriptionCancelled,
  sendWinbackOffer,

  // Business (B2C)
  sendBookingConfirmation,
  sendBookingReminder,
  sendServiceCompleted,
  sendLoyaltyReward,
  sendBirthdayDiscount,

  // Utilitários
  testEmailConfiguration,
  sendTestEmail,
};

// ================================
// 📊 RESUMO DO SISTEMA DE EMAILS
// ================================

export const getEmailSystemSummary = () => {
  const templates = getAvailableEmailTemplates();
  const totalTemplates = Object.values(templates).reduce(
    (total, category) => total + category.length,
    0
  );

  return {
    totalTemplates,
    categories: Object.keys(templates).length,
    breakdown: {
      saas: {
        onboarding: templates.saas_onboarding?.length || 0,
        trial: templates.saas_trial?.length || 0,
        payment: templates.saas_payment?.length || 0,
        cancellation: templates.saas_cancellation?.length || 0,
      },
      business: {
        booking: templates.booking?.length || 0,
        marketing: templates.marketing?.length || 0,
      },
    },
    flows: [
      "🚀 Onboarding: Cadastro → Boas-vindas → Tutorial",
      "⏰ Trial: 7 dias → 1 dia → Expirado → Winback",
      "💳 Pagamento: Confirmação → Fatura → Falha → Cancelamento",
      "📋 Agendamento: Confirmação → Lembrete → Concluído",
      "🎁 Marketing: Fidelidade → Aniversário → Promoções",
    ],
  };
};
