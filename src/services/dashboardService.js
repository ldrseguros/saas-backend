import { PrismaClient } from "@prisma/client";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns";

const prisma = new PrismaClient();

export const fetchDashboardStatistics = async (tenantId) => {
  // Validar se tenantId foi fornecido
  if (!tenantId) {
    const error = new Error(
      "TenantId é obrigatório para buscar estatísticas do dashboard"
    );
    error.statusCode = 400;
    throw error;
  }

  try {
    console.log(
      `[DashboardService] Iniciando busca de estatísticas do dashboard para tenant ${tenantId}...`
    );
    // 1. Bookings for today
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    console.log(
      "[DashboardService] Buscando quantidade de agendamentos de hoje..."
    );
    const bookingsToday = await prisma.booking.count({
      where: {
        tenantId: tenantId, // FILTRO POR TENANT
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
        // status: { not: 'cancelled' } // Optional: Filter out cancelled bookings
      },
    });
    console.log(`[DashboardService] Agendamentos de hoje: ${bookingsToday}`);

    // 2. Total bookings
    console.log("[DashboardService] Buscando total de agendamentos...");
    const totalBookings = await prisma.booking.count({
      where: {
        tenantId: tenantId, // FILTRO POR TENANT
      },
      // where: { status: { not: 'cancelled' } } // Optional: Filter out cancelled bookings
    });
    console.log(`[DashboardService] Total de agendamentos: ${totalBookings}`);

    // 3. New clients per month (e.g., last 6 months)
    const monthsToQuery = 6;
    const clientCountsByMonth = [];
    for (let i = 0; i < monthsToQuery; i++) {
      const dateCursor = subMonths(today, i);
      const firstDayOfMonth = startOfMonth(dateCursor);
      const lastDayOfMonth = endOfMonth(dateCursor);

      console.log(
        `[DashboardService] Buscando clientes criados entre ${firstDayOfMonth} e ${lastDayOfMonth}...`
      );
      const newClientsThisMonth = await prisma.clientProfile.count({
        where: {
          account: {
            tenantId: tenantId, // FILTRO POR TENANT
          },
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      });
      console.log(
        `[DashboardService] Novos clientes neste mês: ${newClientsThisMonth}`
      );
      clientCountsByMonth.push({
        month: format(firstDayOfMonth, "yyyy-MM"), // e.g., "2023-12"
        count: newClientsThisMonth,
      });
    }
    clientCountsByMonth.reverse(); // Oldest month first

    console.log("[DashboardService] Estatísticas coletadas com sucesso.");
    return {
      bookingsToday,
      totalBookings,
      newClientsPerMonth: clientCountsByMonth,
    };
  } catch (error) {
    console.error("[DashboardService] Erro ao buscar estatísticas:", error);
    // Re-throw the error to be caught by the controller or a global error handler
    const serviceError = new Error(
      "Failed to fetch dashboard statistics from service. " + error.message
    );
    throw serviceError;
  }
};
