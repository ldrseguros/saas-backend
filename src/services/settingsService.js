import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Obter todas as configurações do sistema
export const getSystemSettings = async () => {
  // Verificar se já existem configurações
  const existingSettings = await prisma.systemSettings.findFirst();

  // Se não existirem, criar configurações padrão
  if (!existingSettings) {
    return await prisma.systemSettings.create({
      data: {
        businessHours: {
          weekdays: {
            start: "08:00",
            end: "18:00",
          },
          saturday: {
            start: "09:00",
            end: "15:00",
          },
          sunday: {
            start: "",
            end: "",
          },
        },
        appointmentDuration: 30, // duração padrão em minutos
        maxAppointmentsPerDay: 20,
        whatsappEnabled: true,
        emailNotificationsEnabled: true,
      },
    });
  }

  return existingSettings;
};

// Atualizar configurações do sistema
export const updateSystemSettings = async (settingsData) => {
  // Verificar se já existem configurações
  const existingSettings = await prisma.systemSettings.findFirst();

  if (existingSettings) {
    // Atualizar configurações existentes
    return await prisma.systemSettings.update({
      where: { id: existingSettings.id },
      data: settingsData,
    });
  } else {
    // Criar novas configurações
    return await prisma.systemSettings.create({
      data: settingsData,
    });
  }
};
