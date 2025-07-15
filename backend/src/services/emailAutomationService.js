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
} from "./saasEmailService.js";
import {
  sendBookingConfirmation,
  sendBookingReminder,
  sendServiceCompleted,
  sendLoyaltyReward,
  sendBirthdayDiscount,
} from "./businessEmailService.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ================================
// 🎯 AUTOMAÇÃO DE EMAILS B2B (SaaS → Donos)
// ================================

/**
 * 🎉 EVENTO: Usuário se cadastrou
 * Dispara: Email de boas-vindas + Tutorial (após 1 hora)
 */
export const onUserRegistered = async (userData) => {
  try {
    console.log(`📧 [AUTOMAÇÃO] Usuário registrado: ${userData.email}`);

    // 1. Enviar email de boas-vindas imediatamente
    await sendWelcomeEmail(userData.email, {
      ownerName: userData.name,
      dashboardUrl: userData.dashboardUrl,
    });

    // 2. Agendar tutorial para 1 hora depois (simulado - você pode usar node-cron)
    setTimeout(async () => {
      await sendTutorialFirstSteps(userData.email, {
        ownerName: userData.name,
        dashboardUrl: userData.dashboardUrl,
      });
    }, 60 * 60 * 1000); // 1 hora

    return { success: true, message: "Sequência de onboarding iniciada" };
  } catch (error) {
    console.error("Erro na automação de registro:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ⏰ EVENTO: Trial chegando ao fim
 * Dispara: Lembrete 7 dias, depois 1 dia
 */
export const onTrialReminder = async (tenantId, daysRemaining) => {
  try {
    // Buscar dados do tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        accounts: {
          where: { role: "OWNER" },
          take: 1,
        },
        subscriptionPlan: true,
        _count: {
          select: {
            bookings: true,
            clients: true,
            services: true,
          },
        },
      },
    });

    if (!tenant || !tenant.accounts[0]) {
      throw new Error("Tenant ou owner não encontrado");
    }

    const owner = tenant.accounts[0];
    const trialData = {
      ownerName: owner.name,
      expirationDate: tenant.trialEndsAt?.toLocaleDateString("pt-BR"),
      bookingsCount: tenant._count.bookings,
      clientsCount: tenant._count.clients,
      servicesCount: tenant._count.services,
      upgradeUrl: `${process.env.FRONTEND_URL}/admin/subscription`,
    };

    if (daysRemaining === 7) {
      await sendTrialReminder7Days(owner.email, trialData);
      console.log(
        `📧 [AUTOMAÇÃO] Lembrete 7 dias enviado para: ${owner.email}`
      );
    } else if (daysRemaining === 1) {
      await sendTrialReminder1Day(owner.email, trialData);
      console.log(`📧 [AUTOMAÇÃO] Último dia enviado para: ${owner.email}`);
    }

    return { success: true, message: `Lembrete ${daysRemaining} dias enviado` };
  } catch (error) {
    console.error("Erro na automação de trial:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ❌ EVENTO: Trial expirou
 * Dispara: Email de trial expirado
 */
export const onTrialExpired = async (tenantId) => {
  try {
    // Buscar dados do tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        accounts: {
          where: { role: "OWNER" },
          take: 1,
        },
        _count: {
          select: {
            bookings: true,
            clients: true,
            services: true,
          },
        },
      },
    });

    if (!tenant || !tenant.accounts[0]) {
      throw new Error("Tenant ou owner não encontrado");
    }

    const owner = tenant.accounts[0];
    const trialData = {
      ownerName: owner.name,
      bookingsCount: tenant._count.bookings,
      clientsCount: tenant._count.clients,
      servicesCount: tenant._count.services,
      upgradeUrl: `${process.env.FRONTEND_URL}/admin/subscription`,
    };

    await sendTrialExpired(owner.email, trialData);
    console.log(`📧 [AUTOMAÇÃO] Trial expirado enviado para: ${owner.email}`);

    return { success: true, message: "Email de trial expirado enviado" };
  } catch (error) {
    console.error("Erro na automação de trial expirado:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ✅ EVENTO: Assinatura confirmada
 * Dispara: Email de confirmação de assinatura
 */
export const onSubscriptionConfirmed = async (tenantId) => {
  try {
    // Buscar dados do tenant e assinatura
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        accounts: {
          where: { role: "OWNER" },
          take: 1,
        },
        subscriptionPlan: true,
      },
    });

    if (!tenant || !tenant.accounts[0] || !tenant.subscriptionPlan) {
      throw new Error("Dados da assinatura não encontrados");
    }

    const owner = tenant.accounts[0];
    const subscriptionData = {
      ownerName: owner.name,
      planName: tenant.subscriptionPlan.name,
      planPrice: tenant.subscriptionPlan.price.toString(),
      startDate: new Date().toLocaleDateString("pt-BR"),
      nextBilling: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toLocaleDateString("pt-BR"),
      maxEmployees: tenant.subscriptionPlan.maxEmployees,
      maxClients: tenant.subscriptionPlan.maxClients,
      dashboardUrl: `${process.env.FRONTEND_URL}/admin/dashboard`,
    };

    await sendSubscriptionConfirmation(owner.email, subscriptionData);
    console.log(
      `📧 [AUTOMAÇÃO] Confirmação assinatura enviada para: ${owner.email}`
    );

    return { success: true, message: "Confirmação de assinatura enviada" };
  } catch (error) {
    console.error("Erro na automação de confirmação:", error);
    return { success: false, error: error.message };
  }
};

/**
 * 💳 EVENTO: Falha no pagamento
 * Dispara: Email de falha no pagamento
 */
export const onPaymentFailed = async (tenantId, paymentDetails) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        accounts: {
          where: { role: "OWNER" },
          take: 1,
        },
        subscriptionPlan: true,
      },
    });

    if (!tenant || !tenant.accounts[0]) {
      throw new Error("Tenant não encontrado");
    }

    const owner = tenant.accounts[0];
    const paymentData = {
      ownerName: owner.name,
      planPrice: tenant.subscriptionPlan?.price?.toString() || "0,00",
      planName: tenant.subscriptionPlan?.name || "Plano Básico",
      attemptDate: new Date().toLocaleDateString("pt-BR"),
      failureReason: paymentDetails.failureReason || "Cartão recusado",
      suspensionDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toLocaleDateString("pt-BR"),
      updatePaymentUrl: `${process.env.FRONTEND_URL}/admin/subscription`,
    };

    await sendPaymentFailed(owner.email, paymentData);
    console.log(`📧 [AUTOMAÇÃO] Falha pagamento enviada para: ${owner.email}`);

    return { success: true, message: "Email de falha no pagamento enviado" };
  } catch (error) {
    console.error("Erro na automação de falha de pagamento:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ❌ EVENTO: Assinatura cancelada
 * Dispara: Email de cancelamento + Agendamento de winback
 */
export const onSubscriptionCancelled = async (tenantId, cancellationData) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        accounts: {
          where: { role: "OWNER" },
          take: 1,
        },
        _count: {
          select: {
            bookings: true,
            clients: true,
          },
        },
      },
    });

    if (!tenant || !tenant.accounts[0]) {
      throw new Error("Tenant não encontrado");
    }

    const owner = tenant.accounts[0];
    const cancelData = {
      ownerName: owner.name,
      accessUntil:
        cancellationData.accessUntil ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(
          "pt-BR"
        ),
      subscriptionDuration: cancellationData.subscriptionDuration || "6 meses",
      totalBookings: tenant._count.bookings,
      totalClients: tenant._count.clients,
      totalRevenue: cancellationData.totalRevenue || "0,00",
      downloadDataUrl: `${process.env.FRONTEND_URL}/admin/data-export`,
    };

    // 1. Enviar email de cancelamento
    await sendSubscriptionCancelled(owner.email, cancelData);

    // 2. Agendar email de winback para 60 dias (simulado)
    setTimeout(async () => {
      const offerData = {
        ownerName: owner.name,
        offerExpiry: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toLocaleDateString("pt-BR"),
        winbackUrl: `${process.env.FRONTEND_URL}/admin/subscription`,
      };
      await sendWinbackOffer(owner.email, offerData);
    }, 60 * 24 * 60 * 60 * 1000); // 60 dias

    console.log(`📧 [AUTOMAÇÃO] Cancelamento enviado para: ${owner.email}`);

    return { success: true, message: "Sequência de cancelamento iniciada" };
  } catch (error) {
    console.error("Erro na automação de cancelamento:", error);
    return { success: false, error: error.message };
  }
};

// ================================
// 🎯 AUTOMAÇÃO DE EMAILS B2C (Estética → Clientes)
// ================================

/**
 * 📅 EVENTO: Agendamento criado
 * Dispara: Email de confirmação
 */
export const onBookingCreated = async (bookingId) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        service: true,
        tenant: true,
        vehicle: true,
      },
    });

    if (!booking) {
      throw new Error("Agendamento não encontrado");
    }

    const bookingData = {
      clientName: booking.client.name,
      serviceName: booking.service.name,
      date: booking.scheduledAt.toLocaleDateString("pt-BR"),
      time: booking.scheduledAt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      vehicleInfo: `${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.color} - ${booking.vehicle.licensePlate}`,
      price: booking.totalPrice.toString(),
      businessName: booking.tenant.name,
      businessAddress: booking.tenant.address || "Endereço da estética",
      businessPhone: booking.tenant.phone || "Telefone da estética",
    };

    await sendBookingConfirmation(booking.client.email, bookingData);
    console.log(
      `📧 [AUTOMAÇÃO] Confirmação agendamento enviada para: ${booking.client.email}`
    );

    return { success: true, message: "Confirmação de agendamento enviada" };
  } catch (error) {
    console.error("Erro na automação de agendamento:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ⏰ EVENTO: Lembrete de agendamento
 * Dispara: Email de lembrete (1 dia antes)
 */
export const onBookingReminder = async (bookingId) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        service: true,
        tenant: true,
        vehicle: true,
      },
    });

    if (!booking) {
      throw new Error("Agendamento não encontrado");
    }

    const bookingData = {
      clientName: booking.client.name,
      serviceName: booking.service.name,
      date: booking.scheduledAt.toLocaleDateString("pt-BR"),
      time: booking.scheduledAt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      vehicleInfo: `${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.color}`,
      businessName: booking.tenant.name,
      businessAddress: booking.tenant.address || "Endereço da estética",
      businessPhone: booking.tenant.phone || "Telefone da estética",
    };

    await sendBookingReminder(booking.client.email, bookingData);
    console.log(
      `📧 [AUTOMAÇÃO] Lembrete agendamento enviado para: ${booking.client.email}`
    );

    return { success: true, message: "Lembrete de agendamento enviado" };
  } catch (error) {
    console.error("Erro na automação de lembrete:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ✅ EVENTO: Serviço concluído
 * Dispara: Email de serviço concluído
 */
export const onServiceCompleted = async (bookingId) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        service: true,
        tenant: true,
        vehicle: true,
        employee: true,
      },
    });

    if (!booking) {
      throw new Error("Agendamento não encontrado");
    }

    const serviceData = {
      clientName: booking.client.name,
      serviceName: booking.service.name,
      date: booking.scheduledAt.toLocaleDateString("pt-BR"),
      vehicleInfo: `${booking.vehicle.brand} ${booking.vehicle.model} ${booking.vehicle.color}`,
      price: booking.totalPrice.toString(),
      businessName: booking.tenant.name,
      employeeName: booking.employee?.name || "Nossa equipe",
      reviewUrl: `${process.env.FRONTEND_URL}/review/${booking.id}`,
      scheduleAgainUrl: `${process.env.FRONTEND_URL}/booking/${booking.tenant.subdomain}`,
      nextServiceDays: "30",
    };

    await sendServiceCompleted(booking.client.email, serviceData);
    console.log(
      `📧 [AUTOMAÇÃO] Serviço concluído enviado para: ${booking.client.email}`
    );

    return { success: true, message: "Email de serviço concluído enviado" };
  } catch (error) {
    console.error("Erro na automação de serviço concluído:", error);
    return { success: false, error: error.message };
  }
};

/**
 * 🎁 EVENTO: Cliente completou X serviços
 * Dispara: Email de recompensa de fidelidade
 */
export const onLoyaltyMilestone = async (clientId, servicesCount) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        tenant: true,
      },
    });

    if (!client) {
      throw new Error("Cliente não encontrado");
    }

    // Definir recompensas baseadas no número de serviços
    let rewardDescription = "";
    let couponCode = "";

    if (servicesCount === 5) {
      rewardDescription = "10% de desconto no próximo serviço";
      couponCode = `FIEL10-${Date.now()}`;
    } else if (servicesCount === 10) {
      rewardDescription = "Lavagem simples GRÁTIS";
      couponCode = `FIEL-FREE-${Date.now()}`;
    } else if (servicesCount === 20) {
      rewardDescription = "20% de desconto em qualquer serviço";
      couponCode = `FIEL20-${Date.now()}`;
    }

    const rewardData = {
      clientName: client.name,
      servicesCount,
      rewardDescription,
      couponCode,
      expirationDate: new Date(
        Date.now() + 60 * 24 * 60 * 60 * 1000
      ).toLocaleDateString("pt-BR"), // 60 dias
      scheduleUrl: `${process.env.FRONTEND_URL}/booking/${client.tenant.subdomain}`,
      businessName: client.tenant.name,
    };

    await sendLoyaltyReward(client.email, rewardData);
    console.log(
      `📧 [AUTOMAÇÃO] Recompensa fidelidade enviada para: ${client.email}`
    );

    return { success: true, message: "Recompensa de fidelidade enviada" };
  } catch (error) {
    console.error("Erro na automação de fidelidade:", error);
    return { success: false, error: error.message };
  }
};

/**
 * 🎂 EVENTO: Aniversário do cliente
 * Dispara: Email de desconto de aniversário
 */
export const onClientBirthday = async (clientId) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        tenant: true,
      },
    });

    if (!client) {
      throw new Error("Cliente não encontrado");
    }

    const birthdayData = {
      clientName: client.name,
      discountPercent: "25",
      scheduleUrl: `${process.env.FRONTEND_URL}/booking/${client.tenant.subdomain}`,
      businessName: client.tenant.name,
    };

    await sendBirthdayDiscount(client.email, birthdayData);
    console.log(
      `📧 [AUTOMAÇÃO] Desconto aniversário enviado para: ${client.email}`
    );

    return { success: true, message: "Desconto de aniversário enviado" };
  } catch (error) {
    console.error("Erro na automação de aniversário:", error);
    return { success: false, error: error.message };
  }
};

// ================================
// 🕐 FUNÇÕES DE AGENDAMENTO/CRON
// ================================

/**
 * Verificar trials que estão para expirar
 * Execute via cron job diariamente
 */
export const checkTrialsExpiring = async () => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Trials que expiram em 7 dias
    const trialsIn7Days = await prisma.tenant.findMany({
      where: {
        trialEndsAt: {
          gte: new Date(in7Days.toDateString()),
          lt: new Date(
            new Date(in7Days.getTime() + 24 * 60 * 60 * 1000).toDateString()
          ),
        },
        subscriptionStatus: "TRIAL",
      },
    });

    // Trials que expiram amanhã
    const trialsIn1Day = await prisma.tenant.findMany({
      where: {
        trialEndsAt: {
          gte: new Date(tomorrow.toDateString()),
          lt: new Date(
            new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toDateString()
          ),
        },
        subscriptionStatus: "TRIAL",
      },
    });

    // Trials que expiraram hoje
    const expiredTrials = await prisma.tenant.findMany({
      where: {
        trialEndsAt: {
          lt: now,
        },
        subscriptionStatus: "TRIAL",
      },
    });

    // Enviar lembretes
    for (const tenant of trialsIn7Days) {
      await onTrialReminder(tenant.id, 7);
    }

    for (const tenant of trialsIn1Day) {
      await onTrialReminder(tenant.id, 1);
    }

    for (const tenant of expiredTrials) {
      await onTrialExpired(tenant.id);
      // Atualizar status para EXPIRED
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { subscriptionStatus: "EXPIRED" },
      });
    }

    console.log(
      `📧 [CRON] Processados: ${trialsIn7Days.length} (7d) + ${trialsIn1Day.length} (1d) + ${expiredTrials.length} (exp)`
    );

    return {
      success: true,
      processed: {
        in7Days: trialsIn7Days.length,
        in1Day: trialsIn1Day.length,
        expired: expiredTrials.length,
      },
    };
  } catch (error) {
    console.error("Erro no cron de trials:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Verificar agendamentos que precisam de lembrete
 * Execute via cron job diariamente
 */
export const checkBookingReminders = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookingsForReminder = await prisma.booking.findMany({
      where: {
        scheduledAt: {
          gte: new Date(tomorrow.toDateString()),
          lt: new Date(
            new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toDateString()
          ),
        },
        status: "CONFIRMED",
        reminderSent: false,
      },
    });

    let remindersSent = 0;

    for (const booking of bookingsForReminder) {
      await onBookingReminder(booking.id);

      // Marcar lembrete como enviado
      await prisma.booking.update({
        where: { id: booking.id },
        data: { reminderSent: true },
      });

      remindersSent++;
    }

    console.log(`📧 [CRON] ${remindersSent} lembretes de agendamento enviados`);

    return { success: true, remindersSent };
  } catch (error) {
    console.error("Erro no cron de lembretes:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Verificar aniversários do dia
 * Execute via cron job diariamente
 */
export const checkClientBirthdays = async () => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const clientsWithBirthday = await prisma.client.findMany({
      where: {
        birthDate: {
          not: null,
        },
      },
    });

    // Filtrar clientes que fazem aniversário hoje
    const todayBirthdays = clientsWithBirthday.filter((client) => {
      if (client.birthDate) {
        const birthMonth = client.birthDate.getMonth() + 1;
        const birthDay = client.birthDate.getDate();
        return birthMonth === month && birthDay === day;
      }
      return false;
    });

    let birthdayEmailsSent = 0;

    for (const client of todayBirthdays) {
      await onClientBirthday(client.id);
      birthdayEmailsSent++;
    }

    console.log(
      `📧 [CRON] ${birthdayEmailsSent} emails de aniversário enviados`
    );

    return { success: true, birthdayEmailsSent };
  } catch (error) {
    console.error("Erro no cron de aniversários:", error);
    return { success: false, error: error.message };
  }
};

// ================================
// 🔧 UTILITÁRIOS
// ================================

/**
 * Obter estatísticas de emails enviados
 */
export const getEmailStats = async (tenantId) => {
  try {
    // Aqui você pode implementar um sistema de logs de email
    // Por enquanto, retornamos dados simulados
    return {
      totalSent: 150,
      byCategory: {
        onboarding: 25,
        trial: 45,
        payment: 30,
        business: 50,
      },
      deliveryRate: 98.5,
      openRate: 65.2,
    };
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    return null;
  }
};

export default {
  // B2B (SaaS)
  onUserRegistered,
  onTrialReminder,
  onTrialExpired,
  onSubscriptionConfirmed,
  onPaymentFailed,
  onSubscriptionCancelled,

  // B2C (Business)
  onBookingCreated,
  onBookingReminder,
  onServiceCompleted,
  onLoyaltyMilestone,
  onClientBirthday,

  // Cron jobs
  checkTrialsExpiring,
  checkBookingReminders,
  checkClientBirthdays,

  // Utils
  getEmailStats,
};
