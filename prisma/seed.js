
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpando dados existentes...");
  await prisma.$transaction([
    prisma.tenant.deleteMany(),
    prisma.subscriptionPlan.deleteMany(),
  ]);

  console.log("Criando planos...");
  const basicPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Básico",
      description: "Ideal para estéticas pequenas que estão começando",
      price: 36.99,
      billingCycle: "monthly",
      features: [
        "Agendamentos online",
        "Gerenciamento de clientes",
        "Lembretes por WhatsApp",
        "Painel administrativo",
      ],
      maxEmployees: 2,
      maxClients: 100,
    },
  });

  const proPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Profissional",
      description: "Perfeito para estéticas em crescimento",
      price: 46.99,
      billingCycle: "monthly",
      features: [
        "Todas as funcionalidades do plano Básico",
        "Relatórios avançados",
        "Múltiplos serviços",
        "Personalização da página de agendamento",
      ],
      maxEmployees: 5,
      maxClients: 500,
    },
  });

  const premiumPlan = await prisma.subscriptionPlan.create({
    data: {
      name: "Premium",
      description: "Para estéticas de grande porte com alto volume",
      price: 56.99,
      billingCycle: "monthly",
      features: [
        "Todas as funcionalidades do plano Profissional",
        "API para integração com outros sistemas",
        "Suporte prioritário",
        "Recursos de marketing",
      ],
      maxEmployees: 10,
      maxClients: null,
    },
  });

  console.log("Criando tenants...");
  const premiumTenant = await prisma.tenant.create({
    data: {
      name: "Premium Estética",
      subdomain: "premium",
      contactEmail: "contato@premiumestetica.com.br",
      contactPhone: "11999999999",
      address: "Av. Paulista, 1000",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-100",
      subscriptionStatus: "ACTIVE",
      planId: premiumPlan.id,
      stripeCustomerId: "cus_premium123",
      subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const modeloTenant = await prisma.tenant.create({
    data: {
      name: "Estética Modelo",
      subdomain: "modelo",
      contactEmail: "contato@esteticamodelo.com.br",
      contactPhone: "11988888888",
      address: "Rua Augusta, 500",
      city: "São Paulo",
      state: "SP",
      zipCode: "01304-000",
      subscriptionStatus: "ACTIVE",
      planId: proPlan.id,
      stripeCustomerId: "cus_modelo123",
      subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const testeTenant = await prisma.tenant.create({
    data: {
      name: "Estética Teste",
      subdomain: "teste",
      contactEmail: "contato@estaticateste.com.br",
      contactPhone: "11977777777",
      address: "Rua Teste, 123",
      city: "São Paulo",
      state: "SP",
      zipCode: "04001-000",
      subscriptionStatus: "TRIAL",
      planId: basicPlan.id,
      stripeCustomerId: "cus_teste123",
      trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  });

  const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
  };

const createOrUpdateUser = async ({
  email,
  password,
  role,
  tenantId,
  employeeName,
  clientName,
  whatsapp,
}) => {
  return prisma.authAccount.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await hashPassword(password),
      role,
      tenantId,
      ...(employeeName && {
        employee: {
          create: {
            name: employeeName,
          },
        },
      }),
      ...(clientName && {
        client: {
          create: {
            name: clientName,
            whatsapp,
            tenant: {
              connect: { id: tenantId }, // 🔥 ISSO É OBRIGATÓRIO!
            },
          },
        },
      }),
    },
  });
};

  console.log("Criando usuários para tenant Premium...");
  await createOrUpdateUser({
    email: "admin@premium.com",
    password: "Senha123",
    role: "TENANT_ADMIN",
    tenantId: premiumTenant.id,
    employeeName: "Administrador Premium",
  });

  await createOrUpdateUser({
    email: "funcionario@premium.com",
    password: "Senha123",
    role: "EMPLOYEE",
    tenantId: premiumTenant.id,
    employeeName: "Funcionário Premium",
  });

  console.log("Criando usuários para tenant Teste...");
  const cliente1Account = await createOrUpdateUser({
    email: "joao@exemplo.com",
    password: "Senha123",
    role: "CLIENT",
    tenantId: testeTenant.id,
    clientName: "João Silva",
    whatsapp: "11999998888",
  });

  const cliente2Account = await createOrUpdateUser({
    email: "maria@exemplo.com",
    password: "Senha123",
    role: "CLIENT",
    tenantId: testeTenant.id,
    clientName: "Maria Oliveira",
    whatsapp: "11997776666",
  });

  const cliente3Account = await createOrUpdateUser({
    email: "carlos@exemplo.com",
    password: "Senha123",
    role: "CLIENT",
    tenantId: testeTenant.id,
    clientName: "Carlos Pereira",
    whatsapp: "11995554444",
  });

  await createOrUpdateUser({
    email: "admin@teste.com",
    password: "Senha123",
    role: "TENANT_ADMIN",
    tenantId: testeTenant.id,
    employeeName: "Administrador Teste",
  });

  await createOrUpdateUser({
    email: "funcionario@teste.com",
    password: "Senha123",
    role: "EMPLOYEE",
    tenantId: testeTenant.id,
    employeeName: "Funcionário Teste",
  });

  console.log("Criando veículos para os clientes...");
  const cliente1 = await prisma.clientProfile.findFirst({
    where: { accountId: cliente1Account.id },
  });
  const cliente2 = await prisma.clientProfile.findFirst({
    where: { accountId: cliente2Account.id },
  });
  const cliente3 = await prisma.clientProfile.findFirst({
    where: { accountId: cliente3Account.id },
  });

  const veiculo1 = await prisma.vehicle.create({
    data: {
      brand: "Honda",
      model: "Civic",
      year: 2020,
      plate: "ABC1234",
      color: "Prata",
      clientId: cliente1.id,
      tenantId: testeTenant.id,
    },
  });

  const veiculo2 = await prisma.vehicle.create({
    data: {
      brand: "Toyota",
      model: "Corolla",
      year: 2021,
      plate: "DEF5678",
      color: "Preto",
      clientId: cliente2.id,
      tenantId: testeTenant.id,
    },
  });

  const veiculo3 = await prisma.vehicle.create({
    data: {
      brand: "Jeep",
      model: "Renegade",
      year: 2019,
      plate: "GHI9012",
      color: "Vermelho",
      clientId: cliente3.id,
      tenantId: testeTenant.id,
    },
  });

  console.log("Criando serviços para tenant Teste...");
  const lavagem = await prisma.service.create({
    data: {
      title: "Lavagem Completa",
      description: "Lavagem externa e interna completa com produtos premium",
      price: 80.0,
      duration: 60,
      tenantId: testeTenant.id,
    },
  });

  const polimento = await prisma.service.create({
    data: {
      title: "Polimento",
      description: "Polimento completo da carroceria para remover riscos superficiais",
      price: 200.0,
      duration: 180,
      tenantId: testeTenant.id,
    },
  });

  const higienizacao = await prisma.service.create({
    data: {
      title: "Higienização Interna",
      description: "Limpeza profunda de todo interior do veículo incluindo bancos e carpetes",
      price: 150.0,
      duration: 120,
      tenantId: testeTenant.id,
    },
  });

  const cristalizacao = await prisma.service.create({
    data: {
      title: "Cristalização",
      description: "Proteção e brilho para a pintura com durabilidade de até 6 meses",
      price: 250.0,
      duration: 240,
      tenantId: testeTenant.id,
    },
  });

  console.log("Criando agendamentos para tenant Teste...");
  const hoje = new Date();
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  const depoisAmanha = new Date(hoje);
  depoisAmanha.setDate(hoje.getDate() + 2);

  const booking1 = await prisma.booking.create({
    data: {
      date: hoje,
      time: "10:00",
      status: "confirmed",
      clientId: cliente1.id,
      vehicleId: veiculo1.id,
      tenantId: testeTenant.id,
      specialInstructions: "Cuidado especial com o teto solar",
    },
  });

  await prisma.bookingService.create({
    data: {
      bookingId: booking1.id,
      serviceId: lavagem.id,
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      date: hoje,
      time: "14:30",
      status: "confirmed",
      clientId: cliente2.id,
      vehicleId: veiculo2.id,
      tenantId: testeTenant.id,
    },
  });

  await prisma.bookingService.create({
    data: {
      bookingId: booking2.id,
      serviceId: polimento.id,
    },
  });

  const booking3 = await prisma.booking.create({
    data: {
      date: amanha,
      time: "09:00",
      status: "pending",
      clientId: cliente3.id,
      vehicleId: veiculo3.id,
      tenantId: testeTenant.id,
    },
  });

  await prisma.bookingService.create({
    data: {
      bookingId: booking3.id,
      serviceId: higienizacao.id,
    },
  });

  const booking4 = await prisma.booking.create({
    data: {
      date: amanha,
      time: "15:00",
      status: "confirmed",
      clientId: cliente1.id,
      vehicleId: veiculo1.id,
      tenantId: testeTenant.id,
    },
  });

  await prisma.bookingService.create({
    data: {
      bookingId: booking4.id,
      serviceId: cristalizacao.id,
    },
  });

  const booking5 = await prisma.booking.create({
    data: {
      date: depoisAmanha,
      time: "11:00",
      status: "pending",
      clientId: cliente2.id,
      vehicleId: veiculo2.id,
      tenantId: testeTenant.id,
    },
  });

  await prisma.bookingService.create({
    data: {
      bookingId: booking5.id,
      serviceId: lavagem.id,
    },
  });

  console.log("Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
