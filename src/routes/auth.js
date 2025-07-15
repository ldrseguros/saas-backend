// backend/src/routes/auth.js

import express from "express";
const router = express.Router();

import { login, registerClient } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import prisma from "../lib/prisma.js"; 
import bcrypt from "bcrypt"; 

// Rota de Login para clientes existentes ou admins de tenants
router.post("/login", login);

// Rota de Registro para clientes finais (não tenant admins)
router.post("/register", registerClient);


router.post("/register-tenant-subscription", async (req, res) => {
    try {
        const {
            name, // Nome da estética
            subdomain,
            contactEmail,
            contactPhone,
            planId,
            adminName,
            adminEmail,
            adminPassword,
            trialDays = 15
        } = req.body;

       
        if (!name || !subdomain || !contactEmail || !planId || !adminName || !adminEmail || !adminPassword) {
            return res.status(400).json({ message: "Todos os campos obrigatórios devem ser preenchidos." });
        }

    
        const existingTenantBySubdomain = await prisma.tenant.findUnique({
            where: { subdomain },
        });
        if (existingTenantBySubdomain) {
            return res.status(400).json({ message: "Este subdomínio já está em uso. Por favor, escolha outro." });
        }

       
        const existingAdminAccount = await prisma.authAccount.findUnique({
            where: { email: adminEmail },
        });
        if (existingAdminAccount) {
            return res.status(400).json({ message: "Este email de administrador já está cadastrado." });
        }

        const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: planId },
        });
        if (!plan) {
            return res.status(400).json({ message: "Plano de assinatura não encontrado." });
        }

      
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + parseInt(trialDays));

       
        const result = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name,
                    subdomain,
                    contactEmail,
                    contactPhone,
                    planId,
                    subscriptionStatus: "TRIAL", 
                    trialEndsAt,
                   
                },
            });

            const hashedPassword = await bcrypt.hash(adminPassword, 10);

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
            });

           
            await tx.auditLog.create({
                data: {
                    tenantId: tenant.id,
                    userId: adminAccount.id, 
                    action: "tenant_and_admin_registered",
                    description: `Novo Tenant ${name} e seu Admin ${adminName} (${adminEmail}) registrados.`,
                },
            });

            return { tenant, adminAccount };
        });

        res.status(201).json({
            message: "Assinatura e tenant criados com sucesso!",
            tenantId: result.tenant.id,
            subdomain: result.tenant.subdomain,
            adminEmail: result.adminAccount.email,
        });

    } catch (error) {
        console.error("Erro no processo de assinatura e criação de tenant:", error);
        res.status(500).json({ message: "Erro ao processar sua assinatura. Tente novamente mais tarde." });
    }
});



// Endpoint temporário para debug - verificar dados do usuário
router.get("/me", protect, async (req, res) => {
    try {
        const account = await prisma.authAccount.findUnique({
            where: { id: req.user.id },
            include: {
                employee: true,
                client: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        subdomain: true,
                    },
                },
            },
        });

        if (!account) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        res.json({
            id: account.id,
            email: account.email,
            role: account.role,
            tenantId: account.tenantId,
            tenant: account.tenant,
            employee: account.employee,
            client: account.client,
            debug: {
                userFromToken: req.user,
            },
        });
    } catch (error) {
        console.error("Erro ao buscar dados do usuário:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
    }
});

export default router;