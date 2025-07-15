import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { config } from "dotenv";

// Carregar variáveis de ambiente
config();

const prisma = new PrismaClient();

async function cleanProductionDatabase() {
  console.log("🧹 Iniciando limpeza do banco de dados para produção...");

  try {
    // ⚠️ ATENÇÃO: Este script remove TODOS os dados de teste
    console.log(
      "⚠️  ATENÇÃO: Este script irá DELETAR todos os dados de teste!"
    );
    console.log(
      "⚠️  Pressione Ctrl+C nos próximos 5 segundos para cancelar..."
    );

    // Aguardar 5 segundos para cancelamento
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log("🚀 Iniciando limpeza...");

    // 1. Limpar dados transacionais (manter estrutura)
    console.log("🗑️  Removendo agendamentos de teste...");
    await prisma.bookingService.deleteMany({});
    await prisma.booking.deleteMany({});

    console.log("🗑️  Removendo veículos de teste...");
    await prisma.vehicle.deleteMany({});

    console.log("🗑️  Removendo transações financeiras de teste...");
    await prisma.transaction.deleteMany({});

    console.log("🗑️  Removendo histórico de pagamentos de teste...");
    await prisma.subscriptionPayment.deleteMany({});

    console.log("🗑️  Removendo serviços de teste...");
    await prisma.service.deleteMany({});

    // 2. Limpar usuários de teste (manter estrutura de tenant)
    console.log("🗑️  Removendo usuários de teste...");
    // Remove todos os usuários CLIENT
    await prisma.authAccount.deleteMany({
      where: {
        role: "CLIENT",
      },
    });

    // 3. Resetar configurações para valores padrão
    console.log("⚙️  Resetando configurações...");
    await prisma.tenantSettings.updateMany({
      data: {
        emailNotifications: true,
        whatsappNotifications: false,
        loyaltyProgram: false,
        customDomain: null,
        customLogo: null,
        primaryColor: "#DC2626", // Vermelho padrão
        secondaryColor: "#1F2937", // Cinza escuro padrão
      },
    });

    // 4. Criar dados essenciais para produção
    console.log("🛠️  Criando dados essenciais para produção...");

    // Verificar se existem planos de assinatura
    const subscriptionPlansCount = await prisma.subscriptionPlan.count();
    if (subscriptionPlansCount === 0) {
      console.log("📋 Criando planos de assinatura padrão...");
      await prisma.subscriptionPlan.createMany({
        data: [
          {
            id: "plan_basic",
            name: "Plano Básico",
            description: "Ideal para estéticas pequenas",
            price: 4900, // R$ 49,00
            interval: "MONTHLY",
            maxClients: 100,
            maxServices: 10,
            maxBookings: 500,
            features: [
              "Agendamentos",
              "Clientes",
              "Serviços",
              "Relatórios Básicos",
            ],
            stripeProductId: null,
            stripePriceId: null,
            isActive: true,
          },
          {
            id: "plan_premium",
            name: "Plano Premium",
            description: "Para estéticas em crescimento",
            price: 9900, // R$ 99,00
            interval: "MONTHLY",
            maxClients: 500,
            maxServices: 50,
            maxBookings: 2000,
            features: [
              "Agendamentos",
              "Clientes",
              "Serviços",
              "Relatórios Avançados",
              "WhatsApp",
              "Email Marketing",
            ],
            stripeProductId: null,
            stripePriceId: null,
            isActive: true,
          },
          {
            id: "plan_enterprise",
            name: "Plano Enterprise",
            description: "Para grandes operações",
            price: 19900, // R$ 199,00
            interval: "MONTHLY",
            maxClients: -1, // Ilimitado
            maxServices: -1, // Ilimitado
            maxBookings: -1, // Ilimitado
            features: [
              "Tudo do Premium",
              "Multi-usuários",
              "API Access",
              "Suporte Prioritário",
            ],
            stripeProductId: null,
            stripePriceId: null,
            isActive: true,
          },
        ],
      });
    }

    // 5. Estatísticas finais
    const stats = await getCleanupStats();
    console.log("\n✅ Limpeza concluída com sucesso!");
    console.log("📊 Estatísticas finais:");
    console.log(`   • Tenants: ${stats.tenants}`);
    console.log(`   • Usuários ativos: ${stats.users}`);
    console.log(`   • Planos disponíveis: ${stats.plans}`);

    console.log("\n🚀 Banco de dados pronto para produção!");
    console.log("\n📋 Próximos passos:");
    console.log("   1. Configure as chaves reais do Stripe nos planos");
    console.log("   2. Configure SMTP para emails em produção");
    console.log("   3. Configure Twilio para WhatsApp (opcional)");
    console.log("   4. Remova arquivos de upload de teste do servidor");
    console.log("   5. Configure domínio personalizado se necessário");
  } catch (error) {
    console.error("❌ Erro durante a limpeza:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function getCleanupStats() {
  const [tenants, users, plans] = await Promise.all([
    prisma.tenant.count(),
    prisma.authAccount.count(),
    prisma.subscriptionPlan.count(),
  ]);

  return { tenants, users, plans };
}

// Executar apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanProductionDatabase()
    .then(() => {
      console.log("🎉 Processo concluído!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Falha no processo:", error);
      process.exit(1);
    });
}

export { cleanProductionDatabase };
