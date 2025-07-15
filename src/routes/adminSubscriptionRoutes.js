import express from "express";
import { PrismaClient } from "@prisma/client";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Listar planos de assinatura ativos para admins de tenant
 * GET /api/admin/subscription-plans
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

export default router;
