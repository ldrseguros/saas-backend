import express from "express";
import { PrismaClient } from "@prisma/client";
import protect from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Obter resumo financeiro para dashboard
 * GET /api/admin/financial/summary
 */
router.get(
  "/summary",
  protect,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const tenantId = req.user.tenantId;

      if (!tenantId) {
        return res.status(400).json({ message: "Tenant não identificado" });
      }

      const today = new Date();
      const startOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const startOfWeek = new Date(
        today.getTime() - today.getDay() * 24 * 60 * 60 * 1000
      );
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Receita de hoje
      const revenueToday = await prisma.transaction.aggregate({
        where: {
          tenantId,
          type: "INCOME",
          date: {
            gte: startOfToday,
          },
        },
        _sum: {
          value: true,
        },
      });

      // Receita desta semana
      const revenueThisWeek = await prisma.transaction.aggregate({
        where: {
          tenantId,
          type: "INCOME",
          date: {
            gte: startOfWeek,
          },
        },
        _sum: {
          value: true,
        },
      });

      // Receita deste mês
      const revenueThisMonth = await prisma.transaction.aggregate({
        where: {
          tenantId,
          type: "INCOME",
          date: {
            gte: startOfMonth,
          },
        },
        _sum: {
          value: true,
        },
      });

      // Despesas deste mês
      const expensesThisMonth = await prisma.transaction.aggregate({
        where: {
          tenantId,
          type: "EXPENSE",
          date: {
            gte: startOfMonth,
          },
        },
        _sum: {
          value: true,
        },
      });

      const revenueTotal = revenueThisMonth._sum.value || 0;
      const expensesTotal = expensesThisMonth._sum.value || 0;
      const netProfitThisMonth = revenueTotal - expensesTotal;

      res.json({
        revenueToday: revenueToday._sum.value || 0,
        revenueThisWeek: revenueThisWeek._sum.value || 0,
        revenueThisMonth: revenueTotal,
        expensesThisMonth: expensesTotal,
        netProfitThisMonth,
      });
    } catch (error) {
      console.error("Erro ao buscar resumo financeiro:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  }
);

export default router;
