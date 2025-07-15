import express from "express";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import protect from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { requireTenantAccess } from "../middlewares/tenantMiddleware.js";
import dotenv from "dotenv";
import { sendSubscriptionConfirmation } from "../services/emailService.js";
import {
  getPaymentHistoryController,
  getPaymentStatsController,
  getLastPaymentController,
  getNextBillingController,
  createPaymentController,
  updatePaymentStatusController,
  getPlanLimitsController,
} from "../controllers/subscriptionPaymentController.js";

dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

// Verificar se a chave do Stripe está disponível
const stripeSecretKey =
  process.env.STRIPE_SECRET_KEY || "dummy_key_for_development";
let stripe;

try {
  stripe = new Stripe(stripeSecretKey);
  console.log("Stripe inicializado com sucesso");
} catch (error) {
  console.warn(
    "AVISO: Stripe não foi inicializado corretamente. Funcionalidades de pagamento estarão indisponíveis."
  );
  console.warn(
    "Defina STRIPE_SECRET_KEY no arquivo .env para habilitar pagamentos."
  );

  // Criar um mock do objeto Stripe para evitar erros
  stripe = {
    checkout: {
      sessions: { create: async () => ({ id: "mock_session", url: "#" }) },
    },
    webhooks: {
      constructEvent: () => ({ type: "mock_event", data: { object: {} } }),
    },
    products: {
      list: async () => ({ data: [] }),
      create: async () => ({ id: "mock_product" }),
    },
    prices: {
      list: async () => ({ data: [] }),
      create: async () => ({ id: "mock_price" }),
    },
    billingPortal: {
      sessions: { create: async () => ({ url: "#" }) },
    },
    subscriptions: {
      retrieve: async () => ({
        current_period_end: Date.now() / 1000 + 30 * 24 * 60 * 60,
        status: "active",
      }),
    },
  };
}

/**
 * Criar uma sessão de checkout para assinatura
 * POST /api/payments/create-checkout-session
 */
router.post(
  "/create-checkout-session",
  protect,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const { planId, tenantId, successUrl, cancelUrl } = req.body;

      // Verificar se o plano existe
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        return res.status(400).json({ message: "Plano não encontrado" });
      }

      const stripePriceId = plan.stripePriceId;

      // Resolver tenantId - se for "current", usar o tenantId do usuário logado
      const resolvedTenantId =
        tenantId === "current" ? req.user.tenantId : tenantId;

      if (!resolvedTenantId) {
        return res.status(400).json({ message: "Tenant não identificado" });
      }

      // Verificar se o tenant existe
      const tenant = await prisma.tenant.findUnique({
        where: { id: resolvedTenantId },
        select: {
          id: true,
          name: true,
          contactEmail: true,
        },
      });

      if (!tenant) {
        return res.status(400).json({ message: "Tenant não encontrado" });
      }

      // Usar o stripePriceId já armazenado no banco de dados do plano
      const stripePricId = plan.stripePriceId;

      if(!stripePriceId){
        return res.status(500).json({ message: "Id do preço Stripe não configurado para este plano" });
      }

      // Criar a sessão de checkout
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: resolvedTenantId,
        customer_email: tenant.contactEmail,
        metadata: {
          tenantId: resolvedTenantId,
          planId,
          planName: plan.name,
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
      console.error("Erro ao criar sessão de checkout:", error);
      res.status(500).json({ message: "Erro ao criar sessão de checkout" });
    }
  }
);

/**
 * Webhook para eventos do Stripe
 * POST /api/payments/webhook
 */

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Lidar com o evento
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    res.json({ received: true });
  }
);

/**
 * Obter o status da assinatura do tenant atual
 * GET /api/payments/subscription-status
 */
router.get(
  "/subscription-status",
  protect,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const tenantId = req.user.tenantId;

      if (!tenantId) {
        return res.status(400).json({ message: "Tenant não identificado" });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          subscriptionStatus: true,
          trialEndsAt: true,
          subscriptionEndsAt: true,
          subscriptionPlan: {
            select: {
              name: true,
              price: true,
              billingCycle: true,
            },
          },
        },
      });

      if (!tenant) {
        return res.status(404).json({ message: "Tenant não encontrado" });
      }

      res.json({
        status: tenant.subscriptionStatus,
        plan: tenant.subscriptionPlan,
        trialEndsAt: tenant.trialEndsAt,
        subscriptionEndsAt: tenant.subscriptionEndsAt,
      });
    } catch (error) {
      console.error("Erro ao verificar status da assinatura:", error);
      res
        .status(500)
        .json({ message: "Erro ao verificar status da assinatura" });
    }
  }
);

/**
 * Criar portal de gerenciamento de assinatura do cliente
 * POST /api/payments/create-customer-portal
 */
router.post(
  "/create-customer-portal",
  protect,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const tenantId = req.user.tenantId;
      const { returnUrl } = req.body;

      if (!tenantId) {
        return res.status(400).json({ message: "Tenant não identificado" });
      }

      // Buscar o tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        return res.status(404).json({ message: "Tenant não encontrado" });
      }

      // Verificar se o tenant tem um customerId do Stripe válido
      let customerId = tenant.stripeCustomerId;

      // Se não tem customerId ou se é um ID de teste inválido, criar um novo
      if (!customerId || customerId.startsWith("cus_teste")) {
        console.log("Criando novo customer no Stripe...");

        const customer = await stripe.customers.create({
          email: tenant.contactEmail,
          name: tenant.name,
          metadata: {
            tenantId: tenant.id,
          },
        });

        customerId = customer.id;

        // Atualizar o tenant com o novo customerId
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            stripeCustomerId: customerId,
          },
        });

        console.log(`Customer criado: ${customerId}`);
      }

      // Criar ou obter configuração do portal
      let portalConfiguration = await getOrCreatePortalConfiguration();

      // Criar a sessão do portal
      try {
        const sessionParams = {
          customer: customerId,
          return_url: returnUrl,
        };

        // Só adicionar configuration se tiver um valor válido
        if (portalConfiguration) {
          sessionParams.configuration = portalConfiguration;
        }

        const session = await stripe.billingPortal.sessions.create(
          sessionParams
        );

        res.json({ url: session.url });
      } catch (stripeError) {
        console.error("Erro específico do Stripe:", stripeError.message);

        // Se ainda der erro, tentar criar uma configuração mais básica
        if (
          stripeError.message.includes("No configuration provided") ||
          stripeError.message.includes("default configuration") ||
          stripeError.message.includes("configuration")
        ) {
          try {
            // Primeira tentativa: criar configuração básica
            const basicConfig = await createBasicPortalConfiguration();

            const sessionParams = {
              customer: customerId,
              return_url: returnUrl,
            };

            if (basicConfig) {
              sessionParams.configuration = basicConfig;
            }

            const session = await stripe.billingPortal.sessions.create(
              sessionParams
            );
            res.json({ url: session.url });
          } catch (fallbackError) {
            console.error("Erro no fallback:", fallbackError.message);

            try {
              // Última tentativa: sem configuração personalizada
              console.log(
                "Tentando criar portal sem configuração personalizada..."
              );
              const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl,
              });

              res.json({ url: session.url });
            } catch (finalError) {
              console.error("Erro final:", finalError.message);

              return res.status(200).json({
                error: "portal_not_configured",
                message:
                  "Portal de gerenciamento não configurado. Entre em contato com o suporte.",
                details:
                  "O administrador precisa configurar o portal no Stripe Dashboard.",
                configUrl:
                  "https://dashboard.stripe.com/test/settings/billing/portal",
              });
            }
          }
        } else {
          throw stripeError;
        }
      }
    } catch (error) {
      console.error("Erro ao criar portal do cliente:", error);
      res.status(500).json({ message: "Erro ao criar portal do cliente" });
    }
  }
);

// Função para obter ou criar configuração do portal
async function getOrCreatePortalConfiguration() {
  try {
    // Listar configurações existentes
    const configurations = await stripe.billingPortal.configurations.list({
      limit: 10,
    });

    // Se já existe uma configuração, usar a primeira
    if (configurations.data.length > 0) {
      return configurations.data[0].id;
    }

    // Criar nova configuração
    return await createBasicPortalConfiguration();
  } catch (error) {
    console.error("Erro ao obter configuração do portal:", error);
    return null;
  }
}

// Função para criar uma configuração básica do portal
async function createBasicPortalConfiguration() {
  try {
    // Configuração mínima que funciona
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "Gerenciar Assinatura",
      },
      features: {
        payment_method_update: { enabled: true },
        invoice_history: { enabled: true },
        customer_update: {
          enabled: true,
          allowed_updates: ["email"],
        },
        subscription_cancel: {
          enabled: true,
          mode: "at_period_end",
        },
      },
    });

    console.log("Configuração do portal criada:", configuration.id);
    return configuration.id;
  } catch (error) {
    console.error("Erro ao criar configuração do portal:", error);
    // Retornar null em caso de erro para não passar string vazia
    return null;
  }
}

// Função para obter ou criar um produto no Stripe
async function getOrCreateStripeProduct(planName) {
  // Buscar produto existente
  const products = await stripe.products.list({
    limit: 100,
  });

  const existingProduct = products.data.find((p) => p.name === planName);

  if (existingProduct) {
    return existingProduct.id;
  }

  // Criar novo produto
  const product = await stripe.products.create({
    name: planName,
    description: `Plano de assinatura ${planName} para o SaaS de Estética Automotiva`,
  });

  return product.id;
}

// Função para obter ou criar um preço no Stripe
async function getOrCreateStripePrice(productId, amount, billingCycle) {
  // Converter para centavos (Stripe trabalha com a menor unidade monetária)
  const unitAmount = Math.round(amount * 100);

  // Definir intervalo de cobrança
  const interval = billingCycle === "yearly" ? "year" : "month";

  // Buscar preço existente
  const prices = await stripe.prices.list({
    product: productId,
    limit: 100,
  });

  const existingPrice = prices.data.find(
    (p) => p.unit_amount === unitAmount && p.recurring?.interval === interval
  );

  if (existingPrice) {
    return existingPrice.id;
  }

  // Criar novo preço
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: "brl",
    recurring: {
      interval: interval,
    },
  });

  return price.id;
}

// Manipulador para checkout.session.completed
async function handleCheckoutSessionCompleted(session) {
  try {
    const { tenantId, planId } = session.metadata;

    if (!tenantId || !planId) {
      console.error("Metadados incompletos na sessão de checkout");
      return;
    }

    // Atualizar o tenant com o ID do cliente do Stripe e status da assinatura
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        stripeCustomerId: session.customer,
        subscriptionStatus: "ACTIVE",
        trialEndsAt: null,
      },
    });

    // Registrar o pagamento
    await prisma.subscriptionPayment.create({
      data: {
        tenantId,
        planId,
        amount: session.amount_total / 100, // Converter de centavos para a moeda
        status: "completed",
        paymentMethod: "credit_card", // Assumindo cartão de crédito
        transactionId: session.payment_intent,
      },
    });

    // Registrar no log de auditoria
    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "subscription_created",
        description: `Assinatura criada via Stripe. ID da sessão: ${session.id}`,
      },
    });

    // Enviar email de confirmação de assinatura
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          subscriptionPlan: true,
        },
      });

      if (tenant && tenant.contactEmail && tenant.subscriptionPlan) {
        const subscriptionData = {
          ownerName: tenant.name,
          planName: tenant.subscriptionPlan.name,
          planPrice: tenant.subscriptionPlan.price.toFixed(2).replace(".", ","),
          startDate: new Date().toLocaleDateString("pt-BR"),
          nextBilling: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toLocaleDateString("pt-BR"),
          maxEmployees: tenant.subscriptionPlan.maxEmployees,
          maxClients: tenant.subscriptionPlan.maxClients,
          dashboardUrl: `${
            process.env.FRONTEND_URL || "http://localhost:8080"
          }/admin/dashboard`,
        };

        await sendSubscriptionConfirmation(
          tenant.contactEmail,
          subscriptionData
        );
        console.log(
          `📧 Email de confirmação de assinatura enviado para: ${tenant.contactEmail}`
        );
      }
    } catch (emailError) {
      console.error(
        "Erro ao enviar email de confirmação de assinatura:",
        emailError
      );
      // Não bloquear o fluxo se o email falhar
    }
  } catch (error) {
    console.error("Erro ao processar checkout.session.completed:", error);
  }
}

// Manipulador para invoice.paid
async function handleInvoicePaid(invoice) {
  try {
    // Obter o cliente e a assinatura
    const subscription = await stripe.subscriptions.retrieve(
      invoice.subscription
    );
    const customerId = invoice.customer;

    // Buscar o tenant pelo ID do cliente do Stripe
    const tenant = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!tenant) {
      console.error(
        `Tenant não encontrado para o cliente Stripe: ${customerId}`
      );
      return;
    }

    // Calcular a próxima data de cobrança
    const nextBillingDate = new Date(subscription.current_period_end * 1000);

    // Registrar o pagamento
    await prisma.subscriptionPayment.create({
      data: {
        tenantId: tenant.id,
        planId: tenant.planId,
        amount: invoice.amount_paid / 100, // Converter de centavos para a moeda
        status: "completed",
        paymentMethod: "credit_card", // Assumindo cartão de crédito
        transactionId: invoice.payment_intent,
        nextBillingDate,
      },
    });

    // Atualizar o status da assinatura se necessário
    if (tenant.subscriptionStatus !== "ACTIVE") {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          subscriptionStatus: "ACTIVE",
          subscriptionEndsAt: nextBillingDate,
        },
      });
    } else {
      // Apenas atualizar a data de fim da assinatura
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          subscriptionEndsAt: nextBillingDate,
        },
      });
    }

    // Registrar no log de auditoria
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "invoice_paid",
        description: `Fatura paga via Stripe. ID da fatura: ${invoice.id}`,
      },
    });
  } catch (error) {
    console.error("Erro ao processar invoice.paid:", error);
  }
}

// Manipulador para invoice.payment_failed
async function handleInvoicePaymentFailed(invoice) {
  try {
    const customerId = invoice.customer;

    // Buscar o tenant pelo ID do cliente do Stripe
    const tenant = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!tenant) {
      console.error(
        `Tenant não encontrado para o cliente Stripe: ${customerId}`
      );
      return;
    }

    // Atualizar o status da assinatura
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: "PAST_DUE",
      },
    });

    // Registrar o pagamento falho
    await prisma.subscriptionPayment.create({
      data: {
        tenantId: tenant.id,
        planId: tenant.planId,
        amount: invoice.amount_due / 100, // Converter de centavos para a moeda
        status: "failed",
        paymentMethod: "credit_card", // Assumindo cartão de crédito
        transactionId: invoice.payment_intent,
      },
    });

    // Registrar no log de auditoria
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "invoice_payment_failed",
        description: `Falha no pagamento da fatura via Stripe. ID da fatura: ${invoice.id}`,
      },
    });
  } catch (error) {
    console.error("Erro ao processar invoice.payment_failed:", error);
  }
}

// Manipulador para customer.subscription.updated
async function handleSubscriptionUpdated(subscription) {
  try {
    const customerId = subscription.customer;

    // Buscar o tenant pelo ID do cliente do Stripe
    const tenant = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!tenant) {
      console.error(
        `Tenant não encontrado para o cliente Stripe: ${customerId}`
      );
      return;
    }

    // Definir o status com base no status do Stripe
    let status;
    switch (subscription.status) {
      case "active":
        status = "ACTIVE";
        break;
      case "past_due":
        status = "PAST_DUE";
        break;
      case "canceled":
        status = "CANCELED";
        break;
      case "unpaid":
        status = "PAST_DUE";
        break;
      default:
        status = tenant.subscriptionStatus; // Manter o status atual
    }

    // Atualizar o tenant
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: status,
        subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
      },
    });

    // Registrar no log de auditoria
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "subscription_updated",
        description: `Assinatura atualizada via Stripe. Novo status: ${status}`,
      },
    });
  } catch (error) {
    console.error("Erro ao processar customer.subscription.updated:", error);
  }
}

// Manipulador para customer.subscription.deleted
async function handleSubscriptionDeleted(subscription) {
  try {
    const customerId = subscription.customer;

    // Buscar o tenant pelo ID do cliente do Stripe
    const tenant = await prisma.tenant.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!tenant) {
      console.error(
        `Tenant não encontrado para o cliente Stripe: ${customerId}`
      );
      return;
    }

    // Atualizar o tenant
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        subscriptionStatus: "CANCELED",
        subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
      },
    });

    // Registrar no log de auditoria
    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "subscription_canceled",
        description: `Assinatura cancelada via Stripe.`,
      },
    });
  } catch (error) {
    console.error("Erro ao processar customer.subscription.deleted:", error);
  }
}

// === NOVAS ROTAS PARA HISTÓRICO DE PAGAMENTOS ===

/**
 * Buscar histórico de pagamentos do tenant
 * GET /api/payments/history
 */
router.get(
  "/history",
  protect,
  requireTenantAccess,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  getPaymentHistoryController
);

/**
 * Buscar estatísticas de pagamentos do tenant
 * GET /api/payments/stats
 */
router.get(
  "/stats",
  protect,
  requireTenantAccess,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  getPaymentStatsController
);

/**
 * Buscar último pagamento do tenant
 * GET /api/payments/last
 */
router.get(
  "/last",
  protect,
  requireTenantAccess,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  getLastPaymentController
);

/**
 * Buscar próxima data de cobrança do tenant
 * GET /api/payments/next-billing
 */
router.get(
  "/next-billing",
  protect,
  requireTenantAccess,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  getNextBillingController
);

/**
 * Criar registro de pagamento manual
 * POST /api/payments/record
 */
router.post(
  "/record",
  protect,
  requireTenantAccess,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  createPaymentController
);

/**
 * Atualizar status de pagamento
 * PATCH /api/payments/:id/status
 */
router.patch(
  "/:id/status",
  protect,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  updatePaymentStatusController
);

/**
 * Buscar limites do plano atual
 * GET /api/payments/plan-limits
 */
router.get(
  "/plan-limits",
  protect,
  requireTenantAccess,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  getPlanLimitsController
);

export default router;
