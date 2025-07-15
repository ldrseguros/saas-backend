import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import Stripe from "stripe"
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Importar todos os seus middlewares
import { resolveTenantId } from './middlewares/tenantResolver.js';
import { protect } from './middlewares/authMiddleware.js';
import { authorizeTenantAccess } from './middlewares/tenantAuthMiddleware.js'; // O NOVO MIDDLEWARE

// Importar todas as suas rotas
import authRoutes from "./routes/auth.js";
import publicRoutes from "./routes/publicRoutes.js"; // Rotas públicas da landing page
import paymentRoutes from "./routes/paymentRoutes.js"; // Rotas para processamento de pagamentos
import protectedRoutes from "./routes/protected.js"; // Exemplo de rotas protegidas genéricas
import userRoutes from "./routes/userRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import emailAutomationRoutes from "./routes/emailAutomationRoutes.js";
import financialRoutes from "./routes/financialRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import adminSubscriptionRoutes from "./routes/adminSubscriptionRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import tenantRoutes from "./routes/tenantRoutes.js"; // Rotas de superadmin para gerenciar tenants
import transactionRoutes from "./routes/finance/transactions.js";
import categoryRoutes from "./routes/finance/categories.js";
import methodRoutes from "./routes/finance/methods.js";

import { PrismaClient } from '@prisma/client';

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Configurar CORS para permitir origens específicas
const allowedOrigins = [
    "http://localhost:8080",
    "http://192.168.0.20:8080",
    "http://localhost:3000",
    "https://saas-estetica-automotiva.vercel.app",
    "https://saas-estetica-automotiva.onrender.com",
    
    "http://meusaas.com.br:8080", 
    "http://admin.meusaas.com.br:8080", 
    "http://painel.meusaas.com.br:8080", 


    "http://esteticaas.meusaas.com.br:8080",
    "http://belezaurbana.meusaas.com.br:8080",
    "http://esteticaneon.meusaas.com.br:8080",
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin && process.env.NODE_ENV === "development") {
                return callback(null, true);
            }
            // Para testar subdomínios, você pode precisar de uma lógica mais sofisticada aqui
            // ou adicionar explicitamente os subdomínios em 'allowedOrigins' como você fez
            if (allowedOrigins.indexOf(origin) !== -1 || (origin && origin.endsWith(`.${process.env.BASE_DOMAIN}:8080`))) {
                callback(null, true);
            } else {
                console.error(`CORS BLOCKED: Origin ${origin} is not in allowed list.`);
                callback(new Error("Bloqueado pelo CORS"));
            }
        },
        credentials: true,
    })
);

// Middleware para Stripe Webhook (deve vir ANTES de express.json() porque o body é raw)
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    
    const sig = req.headers['stripe-signature'];
    let event;

    console.log('--- Webhook recebido ---');

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
        console.log(`Webhook verificado com sucesso para o evento: ${event.type}`);
    } catch (err) {
        console.error(`Erro na verificação do Webhook: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`Tipo de evento detectado: ${event.type}`);

    switch (event.type) {
        case 'checkout.session.completed':
            console.log('Entrou no bloco checkout.session.completed');
            const session = event.data.object;
            console.log(`ID da sessão: ${session.id}`);

            try {
                const subscriptionId = session.subscription;
                const customerId = session.customer;
                const tenantIdFromMetadata = session.metadata.tenantId;

                console.log(`Subscription ID: ${subscriptionId}`);
                console.log(`Customer ID: ${customerId}`);
                console.log(`Tenant ID from Metadata: ${tenantIdFromMetadata}`);

                if (!tenantIdFromMetadata) {
                    console.error('tenantId não encontrado nos metadados da sessão do checkout.');
                    return res.status(400).send('Tenant ID not found in metadata.');
                }

                const tenant = await prisma.tenant.findUnique({
                    where: { id: tenantIdFromMetadata },
                });

                if (tenant) {
                    console.log(`Tenant ${tenant.id} encontrado. Atualizando...`);

                    let priceId = null;
                    let subscriptionEndsAtValue = null;

                    if (subscriptionId) {
                        const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
                        priceId = subscription.items.data[0]?.price?.id;
                        subscriptionEndsAtValue = subscription.current_period_end;

                        console.log(`[checkout.session.completed] Subscription retrieved. Price ID: ${priceId}, Current Period End: ${subscriptionEndsAtValue}`);
                    } else if (session.line_items && session.line_items.data.length > 0) {
                        priceId = session.line_items.data[0]?.price?.id;
                        console.warn(`[checkout.session.completed] Subscription ID not directly on session. Price ID from line_items: ${priceId}. current_period_end will be null.`);
                    }

                    if (!priceId) {
                        console.error('Price ID não encontrado na sessão de checkout ou assinatura.');
                        return res.status(400).send('Price ID missing.');
                    }

                    const ourPlan = await prisma.subscriptionPlan.findFirst({
                        where: { stripePriceId: priceId }
                    });

                    if (ourPlan) {
                        let subscriptionEndsAtDate = null;
                        console.log(`[checkout.session.completed] Valor de subscriptionEndsAtValue antes de criar a data: ${subscriptionEndsAtValue}`);

                        if (subscriptionEndsAtValue && typeof subscriptionEndsAtValue === 'number') {
                            subscriptionEndsAtDate = new Date(subscriptionEndsAtValue * 1000);
                            if (isNaN(subscriptionEndsAtDate.getTime())) {
                                console.error(`[checkout.session.completed] Data calculada para subscriptionEndsAt é inválida: ${subscriptionEndsAtValue}. Será null.`);
                                subscriptionEndsAtDate = null;
                            } else {
                                console.log(`[checkout.session.completed] Data de subscriptionEndsAt calculada com sucesso: ${subscriptionEndsAtDate.toISOString()}`);
                            }
                        } else {
                            console.warn(`[checkout.session.completed] subscriptionEndsAtValue inválido/ausente: ${subscriptionEndsAtValue}. subscriptionEndsAt será null.`);
                        }

                        await prisma.tenant.update({
                            where: { id: tenant.id },
                            data: {
                                stripeSubscriptionId: subscriptionId,
                                stripeCustomerId: customerId,
                                subscriptionStatus: 'ACTIVE',
                                planId: ourPlan.id,
                                subscriptionEndsAt: subscriptionEndsAtDate,
                                trialEndsAt: null,
                            },
                        });
                        console.log(`Tenant ${tenant.id} atualizado com sucesso para ACTIVE com assinatura ${subscriptionId}!`);
                    } else {
                        console.warn(`Plano Stripe com priceId ${priceId} não encontrado no seu banco de dados. Tenant ${tenant.id} não atualizado com plano.`);
                    }

                } else {
                    console.warn(`Tenant com ID ${tenantIdFromMetadata} não encontrado no banco de dados. Este pode ser um erro se o tenant já deveria existir.`);

                    return res.status(404).send('Tenant não encontrado para configuração inicial.');
                }

            } catch (dbError) {
                console.error(`Erro interno ao processar checkout.session.completed:`, dbError);
                return res.status(500).send('Erro interno do servidor ao processar webhook');
            }
            break;

        case 'customer.subscription.created':
            console.log('Entrou no bloco customer.subscription.created');
            const createdSubscription = event.data.object;
            console.log(`Evento customer.subscription.created recebido: ${createdSubscription.id}`);
            console.log(`Stripe Customer ID para created event: ${createdSubscription.customer}`);

            try {
                let tenantToUpdate = await prisma.tenant.findFirst({
                    where: { stripeSubscriptionId: createdSubscription.id }
                });

                if (!tenantToUpdate) {
                    tenantToUpdate = await prisma.tenant.findFirst({
                        where: { stripeCustomerId: createdSubscription.customer }
                    });
                }

                console.log(`Tenant encontrado para customer.subscription.created: ${tenantToUpdate ? tenantToUpdate.id : 'NÃO ENCONTRADO'}`);

                if (tenantToUpdate) {
                    let newPlanId = tenantToUpdate.planId;
                    const newPriceId = createdSubscription.items.data[0]?.price?.id;

                    if (newPriceId) {
                        const newOurPlan = await prisma.subscriptionPlan.findFirst({
                            where: { stripePriceId: newPriceId }
                        });
                        if (newOurPlan) {
                            newPlanId = newOurPlan.id;
                        } else {
                            console.warn(`Novo plano Stripe com PriceId ${newPriceId} não encontrado no seu banco de dados.`);
                        }
                    } else {
                        console.warn(`PriceId não encontrado em createdSubscription.items.data[0].price.`);
                    }

                    let subscriptionEndsAtDate = null;
                    if (createdSubscription.current_period_end && typeof createdSubscription.current_period_end === 'number') {
                        subscriptionEndsAtDate = new Date(createdSubscription.current_period_end * 1000);
                        if (isNaN(subscriptionEndsAtDate.getTime())) {
                            console.error(`[customer.subscription.created] Data calculada para subscriptionEndsAt é inválida: ${createdSubscription.current_period_end}. Será null.`);
                            subscriptionEndsAtDate = null;
                        }
                    } else {
                        console.warn(`[customer.subscription.created] createdSubscription.current_period_end inválido/ausente: ${createdSubscription.current_period_end}. subscriptionEndsAt será null.`);
                    }

                    await prisma.tenant.update({
                        where: { id: tenantToUpdate.id },
                        data: {
                            stripeSubscriptionId: createdSubscription.id,
                            stripeCustomerId: createdSubscription.customer,
                            subscriptionStatus: createdSubscription.status.toUpperCase(),
                            planId: newPlanId,
                            subscriptionEndsAt: subscriptionEndsAtDate,
                            trialEndsAt: null
                        },
                    });
                    console.log(`Assinatura ${createdSubscription.id} criada e tenant ${tenantToUpdate.id} ATUALIZADO com detalhes completos.`);
                } else {
                    console.warn(`Tenant com stripeCustomerId ${createdSubscription.customer} ou stripeSubscriptionId ${createdSubscription.id} não encontrado no banco de dados para customer.subscription.created.`);
                }
            } catch (error) {
                console.error("Erro ao processar customer.subscription.created:", error);
            }
            break;

        case 'customer.subscription.updated':
            const updatedSubscription = event.data.object;
            console.log("Evento customer.subscription.updated recebido:", updatedSubscription.id);

            try {
                const tenantToUpdate = await prisma.tenant.findFirst({
                    where: { stripeSubscriptionId: updatedSubscription.id }
                });

                if (tenantToUpdate) {
                    let newPlanId = tenantToUpdate.planId;

                    if (updatedSubscription.items && updatedSubscription.items.data.length > 0) {
                        const newPriceId = updatedSubscription.items.data[0]?.price?.id;
                        if (newPriceId) {
                            const newOurPlan = await prisma.subscriptionPlan.findFirst({
                                where: { stripePriceId: newPriceId }
                            });
                            if (newOurPlan) {
                                newPlanId = newOurPlan.id;
                            } else {
                                console.warn(`Novo plano Stripe com PriceId ${newPriceId} não encontrado no seu banco de dados.`);
                            }
                        } else {
                            console.warn(`PriceId não encontrado em updatedSubscription.items.data[0].price.`);
                        }
                    }

                    let subscriptionEndsAtDate = null;
                    if (updatedSubscription.current_period_end && typeof updatedSubscription.current_period_end === 'number') {
                        subscriptionEndsAtDate = new Date(updatedSubscription.current_period_end * 1000);
                        if (isNaN(subscriptionEndsAtDate.getTime())) {
                            console.error(`[customer.subscription.updated] Data calculada para subscriptionEndsAt é inválida: ${updatedSubscription.current_period_end}. Será null.`);
                            subscriptionEndsAtDate = null;
                        }
                    } else {
                        console.warn(`[customer.subscription.updated] updatedSubscription.current_period_end inválido/ausente: ${updatedSubscription.current_period_end}. subscriptionEndsAt será null.`);
                    }

                    await prisma.tenant.update({
                        where: { stripeSubscriptionId: updatedSubscription.id },
                        data: {
                            subscriptionStatus: updatedSubscription.status.toUpperCase(),
                            planId: newPlanId,
                            subscriptionEndsAt: subscriptionEndsAtDate,
                        },
                    });
                    console.log(`Assinatura ${updatedSubscription.id} atualizada para status ${updatedSubscription.status}`);
                } else {
                    console.warn(`Tenant com stripeSubscriptionId ${updatedSubscription.id} não encontrado no banco de dados para customer.subscription.updated.`);
                }
            } catch (error) {
                console.error("Erro ao processar customer.subscription.updated:", error);
                return res.status(500).send("Erro no servidor ao processar webhook");
            }
            break;

        case 'customer.subscription.deleted':
            const deletedSubscription = event.data.object;
            console.log("Evento customer.subscription.deleted recebido:", deletedSubscription.id);

            try {
                let subscriptionEndsAtDate = null;
                if (deletedSubscription.current_period_end && typeof deletedSubscription.current_period_end === 'number') {
                    subscriptionEndsAtDate = new Date(deletedSubscription.current_period_end * 1000);
                    if (isNaN(subscriptionEndsAtDate.getTime())) {
                        console.error(`[customer.subscription.deleted] Data calculada para subscriptionEndsAt é inválida: ${deletedSubscription.current_period_end}. Será null.`);
                        subscriptionEndsAtDate = null;
                    }
                } else {
                    console.warn(`[customer.subscription.deleted] deletedSubscription.current_period_end inválido/ausente: ${deletedSubscription.current_period_end}. subscriptionEndsAt será null.`);
                }

                await prisma.tenant.update({
                    where: { stripeSubscriptionId: deletedSubscription.id },
                    data: {
                        subscriptionStatus: 'CANCELED',
                        subscriptionEndsAt: subscriptionEndsAtDate,
                    },
                });
                console.log(`Assinatura ${deletedSubscription.id} cancelada com sucesso.`);
            } catch (error) {
                console.error("Erro ao processar customer.subscription.deleted:", error);
                return res.status(500).send("Erro no servidor ao processar webhook");
            }
            break;

        case 'invoice.payment_succeeded':
            const invoiceSucceeded = event.data.object;
            console.log("Evento invoice.payment_succeeded recebido:", invoiceSucceeded.id);

            if (invoiceSucceeded.subscription) {
                const subscriptionIdForInvoice = invoiceSucceeded.subscription;
                console.log(`Pagamento bem-sucedido para assinatura ${subscriptionIdForInvoice}`);

            }
            break;

        case 'invoice.payment_failed':
            const invoiceFailed = event.data.object;
            console.log("Evento invoice.payment_failed recebido:", invoiceFailed.id);

            if (invoiceFailed.subscription) {
                const subscriptionIdForFailedInvoice = invoiceFailed.subscription;
                console.log(`Pagamento falhou para assinatura ${subscriptionIdForFailedInvoice}`);
            }
            break;

        default:
            console.warn(`Evento de webhook NÃO tratado: ${event.type}`);
    }
    res.status(200).json({ received: true });
});

// Middlewares para parsear JSON no corpo da requisição (para TODAS as outras rotas)
// Devem vir APÓS o webhook do Stripe, mas ANTES das suas rotas regulares.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar pasta de uploads como estática
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Middleware global para resolver o tenantId da URL
// Este deve ser executado para TODAS as requisições que podem ser de um tenant específico.
app.use(resolveTenantId);


// Rotas Públicas (não exigem autenticação)
app.use("/api/public", publicRoutes); // Rotas da landing page, planos, etc.
app.use("/api/auth", authRoutes); // Usar as rotas de autenticação sob o prefixo /api/auth
app.use("/api/payments", paymentRoutes); // Rotas de pagamento (algumas podem ser públicas, outras podem ser protegidas mais tarde)


// ROTAS PROTEGIDAS POR AUTENTICAÇÃO E AUTORIZAÇÃO DE TENANT 
app.use("/api/protected", protect, authorizeTenantAccess, protectedRoutes);
app.use("/api/bookings", protect, authorizeTenantAccess, bookingRoutes);
app.use("/api/services", protect, authorizeTenantAccess, serviceRoutes);
app.use("/api/vehicles", protect, authorizeTenantAccess, vehicleRoutes);

// Rotas protegidas por tenant e restritas a admin
// (assumindo que `userRoutes`, `dashboardRoutes`, etc. esperam um TENANT_ADMIN ou SUPER_ADMIN)
app.use("/api/admin/users", protect, authorizeTenantAccess, userRoutes);
app.use("/api/admin/dashboard", protect, authorizeTenantAccess, dashboardRoutes);
app.use("/api/admin/whatsapp", protect, authorizeTenantAccess, whatsappRoutes);
app.use("/api/admin/email", protect, authorizeTenantAccess, emailRoutes);
app.use("/api/admin/email-automation", protect, authorizeTenantAccess, emailAutomationRoutes);
app.use("/api/admin/financial", protect, authorizeTenantAccess, financialRoutes);
app.use("/api/admin/settings", protect, authorizeTenantAccess, settingsRoutes);
app.use("/api/admin/subscription-plans", protect, authorizeTenantAccess, adminSubscriptionRoutes);

// Rotas de finanças (assumindo que são protegidas e isoladas por tenant)
app.use("/api/finance/transactions", protect, authorizeTenantAccess, transactionRoutes);
app.use("/api/finance/categories", protect, authorizeTenantAccess, categoryRoutes);
app.use("/api/finance/methods", protect, authorizeTenantAccess, methodRoutes);



app.use("/api/superadmin/tenants", protect, authorizeTenantAccess, tenantRoutes);
app.use("/api/superadmin/subscriptions", protect, authorizeTenantAccess, subscriptionRoutes);


app.get("/", (req, res) => {
    res.send("Backend is running!");
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
    console.error("Erro global:", err);
    res.status(500).json({
        message: "Erro interno do servidor",
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
});

app.listen(port, () => {
    console.log(
        `Backend server listening on port ${port} - http://localhost:${port}`
    );
});