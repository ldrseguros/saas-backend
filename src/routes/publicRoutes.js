import express from "express";
import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import emailAutomation from "../services/emailAutomationService.js";

const router = express.Router();

/**
 * Obter todos os planos de assinatura ativos
 * GET /api/public/plans
 */
router.get("/plans", async (req, res) => {
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
    });

    res.json(plans);
  } catch (error) {
    console.error("Erro ao buscar planos:", error);
    res.status(500).json({ message: "Erro ao buscar planos de assinatura" });
  }
});

/**
 * Cadastrar novo tenant (empresa)
 * POST /api/public/signup
 */
router.post("/signup", async (req, res) => {
  try {
    const {
      name,
      subdomain,
      contactEmail,
      contactPhone,
      address,
      city,
      state,
      zipCode,
      adminName,
      adminEmail,
      adminPassword,
      planId,
    } = req.body;

    // Validações básicas
    if (
      !name ||
      !subdomain ||
      !contactEmail ||
      !adminName ||
      !adminEmail ||
      !adminPassword ||
      !planId
    ) {
      return res.status(400).json({
        message:
          "Campos obrigatórios: nome da empresa, subdomínio, email de contato, dados do administrador e plano.",
      });
    }

    // Verificar se o subdomínio já existe
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain },
    });

    if (existingTenant) {
      return res.status(400).json({
        message: "Subdomínio já está em uso. Escolha outro.",
      });
    }

    // Verificar se o plano existe
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return res.status(400).json({
        message: "Plano selecionado não existe.",
      });
    }

    // Criar hash da senha
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Criar tenant e admin em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar o tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          subdomain,
          contactEmail,
          contactPhone,
          address,
          city,
          state,
          zipCode,
          planId,
          subscriptionStatus: "TRIAL",
          trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 dias de trial
        },
      });

      // Criar conta do administrador
      const adminAccount = await tx.authAccount.create({
        data: {
          email: adminEmail,
          passwordHash: hashedPassword,
          role: "TENANT_ADMIN",
          tenantId: tenant.id,
          employee: {
            create: {
              name: adminName,
            },
          },
        },
        include: {
          employee: true,
        },
      });

      return { tenant, adminAccount };
    });

    // 🎉 DISPARAR EMAIL DE BOAS-VINDAS AUTOMÁTICO
    try {
      await emailAutomation.onUserRegistered({
        email: adminEmail,
        name: adminName,
        dashboardUrl: `${
          process.env.FRONTEND_URL || "http://localhost:8080"
        }/admin/dashboard`,
      });
      console.log(
        `📧 [SIGNUP] Email de boas-vindas enviado para: ${adminEmail}`
      );
    } catch (emailError) {
      console.error(
        "📧 [SIGNUP] Erro ao enviar email de boas-vindas:",
        emailError
      );
      // Não bloqueamos o cadastro se o email falhar
    }

    // Retornar sucesso (sem dados sensíveis)
    res.status(201).json({
      success: true,
      message:
        "Conta criada com sucesso! Verifique seu email para dicas de configuração.",
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        subdomain: result.tenant.subdomain,
      },
      redirectTo: `/admin/dashboard`,
    });
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    res.status(500).json({
      message: "Erro interno do servidor. Tente novamente.",
      error: error.message,
    });
  }
});

/**
 * Obter detalhes de um plano específico
 * GET /api/public/plans/:id
 */
router.get("/plans/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
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
    });

    if (!plan) {
      return res.status(404).json({ message: "Plano não encontrado" });
    }

    res.json(plan);
  } catch (error) {
    console.error("Erro ao buscar plano:", error);
    res.status(500).json({ message: "Erro ao buscar detalhes do plano" });
  }
});

/**
 * Verificar disponibilidade de subdomínio
 * GET /api/public/check-subdomain/:subdomain
 */
router.get("/check-subdomain/:subdomain", async (req, res) => {
  try {
    let { subdomain } = req.params;

    // Converter para minúsculas
    subdomain = subdomain.toLowerCase();

    // Verificar se o subdomínio é válido
    const subdomainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return res.status(400).json({
        available: false,
        message: "Subdomínio inválido. Use apenas letras, números e hífens.",
      });
    }

    // Verificar se o subdomínio já está em uso
    const existingTenant = await prisma.tenant.findUnique({
      where: { subdomain },
      select: { id: true },
    });

    res.json({
      subdomain,
      available: !existingTenant,
      message: existingTenant
        ? "Subdomínio já está em uso"
        : "Subdomínio disponível",
    });
  } catch (error) {
    console.error("Erro ao verificar subdomínio:", error);
    res
      .status(500)
      .json({ message: "Erro ao verificar disponibilidade do subdomínio" });
  }
});

/**
 * Rota pública para obter dados de um tenant (estética) pelo subdomínio.
 * GET /api/public/tenant-by-subdomain?subdomain=nome_do_subdominio
 * Esta rota não requer autenticação.
 */

router.get("/tenant-by-subdomain", async (req, res) => {
  try {
    const subdomain = req.query.subdomain;

    if (!subdomain) {
      return res.status(400).json({ message: "Subdomínio não fornecido." });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: subdomain },
      select: {
        id: true,
        name: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Estética não encontrada para este subdomínio." });
    }

    res.json({
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantLogo: tenant.logo,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
    });

  } catch (error) {
    console.error("Erro ao buscar tenant por subdomínio: ", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

/**
 * Cadastrar contato de interesse (lead)
 * POST /api/public/contact
 */
router.post("/contact", async (req, res) => {
  try {
    const { name, email, phone, message, planId } = req.body;

    // Aqui você poderia salvar em um modelo Lead no banco ou enviar por email
    // Para este exemplo, apenas retornamos sucesso

    res.status(201).json({
      success: true,
      message: "Contato recebido com sucesso! Entraremos em contato em breve.",
    });
  } catch (error) {
    console.error("Erro ao cadastrar contato:", error);
    res.status(500).json({ message: "Erro ao processar seu contato" });
  }
});

/**
 * Rota para verificar status/saúde da API
 * GET /api/public/health
 */
router.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;
