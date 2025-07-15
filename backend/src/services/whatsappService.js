import { PrismaClient } from "@prisma/client";
import twilio from "twilio";

const prisma = new PrismaClient();

// Configuração do cliente Twilio
// Estas credenciais devem estar em variáveis de ambiente em produção!
const accountSid = process.env.TWILIO_ACCOUNT_SID || ""; // Adicione seu SID
const authToken = process.env.TWILIO_AUTH_TOKEN || ""; // Adicione seu token
const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || ""; // número do WhatsApp configurado no Twilio (formato: whatsapp:+14155238886)

// Criar cliente Twilio se as credenciais estiverem definidas
const twilioClient =
  accountSid && authToken ? twilio(accountSid, authToken) : null;

// Log para verificar configuração do Twilio
console.log("----- Configuração do Twilio -----");
console.log(`TWILIO_ACCOUNT_SID configurado: ${accountSid ? "Sim" : "Não"}`);
console.log(`TWILIO_AUTH_TOKEN configurado: ${authToken ? "Sim" : "Não"}`);
console.log(
  `TWILIO_WHATSAPP_NUMBER configurado: ${
    twilioWhatsappNumber || "Não configurado"
  }`
);
console.log(`Cliente Twilio inicializado: ${twilioClient ? "Sim" : "Não"}`);
console.log("---------------------------------");

// Função para formatar o número de telefone para o formato esperado pelo WhatsApp
const formatWhatsAppNumber = (phoneNumber) => {
  // Remove todos os caracteres não numéricos
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Adiciona o código do país se não estiver presente
  const withCountryCode = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;

  // Retorna no formato esperado pelo Twilio para WhatsApp
  return `whatsapp:+${withCountryCode}`;
};

// Função para substituir variáveis em templates de mensagem
export const replaceTemplateVariables = (message, data) => {
  let processedMessage = message;

  // Substituir variáveis no formato {{variable_name}}
  if (data.client_name) {
    processedMessage = processedMessage.replace(
      /{{client_name}}/g,
      data.client_name
    );
  }

  if (data.service_name) {
    processedMessage = processedMessage.replace(
      /{{service_name}}/g,
      data.service_name
    );
  }

  if (data.date) {
    processedMessage = processedMessage.replace(/{{date}}/g, data.date);
  }

  if (data.time) {
    processedMessage = processedMessage.replace(/{{time}}/g, data.time);
  }

  // Se ainda houver variáveis não substituídas, fazer log e manter como estão
  const remainingVariables = processedMessage.match(/{{[^}]+}}/g);
  if (remainingVariables) {
    console.log(`Variáveis não substituídas: ${remainingVariables.join(", ")}`);
  }

  return processedMessage;
};

// Obter todas as configurações de mensagens automáticas
export const getWhatsAppTemplates = async () => {
  return await prisma.whatsAppTemplate.findMany({
    orderBy: { createdAt: "desc" },
  });
};

// Obter um template específico por ID
export const getWhatsAppTemplateById = async (id) => {
  const template = await prisma.whatsAppTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    const error = new Error("Template de mensagem não encontrado");
    error.statusCode = 404;
    throw error;
  }

  return template;
};

// Criar um novo template de mensagem
export const createTemplate = async (templateData) => {
  const { name, message, type } = templateData;

  return await prisma.whatsAppTemplate.create({
    data: {
      name,
      message,
      type,
    },
  });
};

// Atualizar um template existente
export const updateTemplate = async (id, templateData) => {
  const { name, message, type } = templateData;

  // Verificar se o template existe
  const templateExists = await prisma.whatsAppTemplate.findUnique({
    where: { id },
  });

  if (!templateExists) {
    return null;
  }

  // Criar objeto com dados para atualizar
  const updateData = {};
  if (name) updateData.name = name;
  if (message) updateData.message = message;
  if (type) updateData.type = type;

  return await prisma.whatsAppTemplate.update({
    where: { id },
    data: updateData,
  });
};

// Excluir um template
export const deleteTemplate = async (id) => {
  // Verificar se o template existe
  const templateExists = await prisma.whatsAppTemplate.findUnique({
    where: { id },
  });

  if (!templateExists) {
    return null;
  }

  await prisma.whatsAppTemplate.delete({
    where: { id },
  });

  return true;
};

// Upload de imagem
export const uploadImage = async (file) => {
  // Em uma implementação real, aqui seria feito o upload para um serviço como AWS S3, Cloudinary, etc.
  // Por enquanto, simularemos o upload retornando uma URL fictícia

  const imageUrl = `/uploads/${Date.now()}-${file.originalname || "image.jpg"}`;

  console.log(`[Mock] Imagem enviada para ${imageUrl}`);

  return imageUrl;
};

// Criar relatório de serviço
export const createServiceReport = async (
  bookingId,
  beforePhotos,
  afterPhotos,
  comments
) => {
  const bookingExists = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!bookingExists) {
    throw new Error("Agendamento não encontrado");
  }

  return await prisma.serviceReport.create({
    data: {
      bookingId,
      beforePhotos,
      afterPhotos,
      comments,
    },
  });
};

// Salvar relatório de serviço com fotos
export const saveServiceReport = async (reportData) => {
  const { bookingId, beforePhotos, afterPhotos, comments } = reportData;

  const bookingExists = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!bookingExists) {
    const error = new Error("Agendamento não encontrado");
    error.statusCode = 404;
    throw error;
  }

  return await prisma.serviceReport.create({
    data: {
      bookingId,
      beforePhotos,
      afterPhotos,
      comments,
    },
  });
};

// Obter relatório de serviço por ID de agendamento
export const getServiceReportByBookingId = async (bookingId) => {
  const report = await prisma.serviceReport.findUnique({
    where: { bookingId },
  });

  if (!report) {
    const error = new Error("Relatório de serviço não encontrado");
    error.statusCode = 404;
    throw error;
  }

  return report;
};

// Enviar mensagem WhatsApp para cliente
export const sendWhatsAppMessage = async (messageData) => {
  const { clientId, message, mediaUrls, templateData } = messageData;
  let client;

  console.log(`Tentando enviar mensagem WhatsApp para clientId: ${clientId}`);

  // Processar variáveis do template se houver dados
  let processedMessage = message;
  if (templateData) {
    processedMessage = replaceTemplateVariables(message, templateData);
  }

  console.log(`Mensagem original: ${message}`);
  console.log(`Mensagem processada: ${processedMessage}`);
  console.log(`MediaUrls: ${JSON.stringify(mediaUrls || [])}`);

  // Primeiro tenta encontrar o cliente pelo ID do ClientProfile
  client = await prisma.clientProfile.findUnique({
    where: { id: clientId },
    include: { account: true },
  });

  // Se não encontrar, tenta pelo ID da AuthAccount
  if (!client) {
    console.log(
      `Cliente não encontrado diretamente com ID ${clientId}, verificando se é um authAccountId...`
    );
    client = await prisma.clientProfile.findUnique({
      where: { accountId: clientId },
      include: { account: true },
    });

    if (client) {
      console.log(
        `Cliente encontrado pelo authAccountId. Cliente: ${JSON.stringify({
          id: client.id,
          name: client.name,
          whatsapp: client.whatsapp,
          accountId: client.accountId,
        })}`
      );
    }
  } else {
    console.log(
      `Cliente encontrado diretamente. Cliente: ${JSON.stringify({
        id: client.id,
        name: client.name,
        whatsapp: client.whatsapp,
        accountId: client.accountId,
      })}`
    );
  }

  if (!client) {
    const error = new Error("Cliente não encontrado");
    error.statusCode = 404;
    throw error;
  }

  if (!client.whatsapp) {
    const error = new Error("Cliente não possui número de WhatsApp registrado");
    error.statusCode = 400;
    throw error;
  }

  try {
    console.log(`Criando registro de mensagem WhatsApp no banco de dados...`);
    // Registrar a mensagem no banco de dados
    const sentMessage = await prisma.whatsAppMessage.create({
      data: {
        clientId: client.id, // Usa sempre o ID do ClientProfile
        message,
        mediaUrls: mediaUrls || [],
        status: "pending", // ou "sent" se enviar imediatamente
      },
    });
    console.log(`Mensagem registrada com sucesso: ${sentMessage.id}`);

    // Enviar mensagem via Twilio se as credenciais estiverem configuradas
    if (twilioClient && twilioWhatsappNumber) {
      try {
        const formattedNumber = formatWhatsAppNumber(client.whatsapp);
        console.log(`Enviando mensagem via Twilio para ${formattedNumber}`);

        const messageOptions = {
          from: twilioWhatsappNumber,
          to: formattedNumber,
          body: processedMessage, // Usar a mensagem processada
        };

        // Adicionar mídia se houver
        if (mediaUrls && mediaUrls.length > 0) {
          messageOptions.mediaUrl = mediaUrls;
        }

        // Enviar mensagem
        const twilioMessage = await twilioClient.messages.create(
          messageOptions
        );
        console.log(`Mensagem Twilio enviada, SID: ${twilioMessage.sid}`);

        // Atualizar o status para "sent"
        await prisma.whatsAppMessage.update({
          where: { id: sentMessage.id },
          data: { status: "sent" },
        });

        return { ...sentMessage, twilioSid: twilioMessage.sid, status: "sent" };
      } catch (twilioError) {
        console.error(
          `Erro ao enviar mensagem via Twilio: ${twilioError.message}`
        );
        console.error(twilioError.stack);

        // Atualizar o status para "failed"
        await prisma.whatsAppMessage.update({
          where: { id: sentMessage.id },
          data: { status: "failed" },
        });

        // Se falhar o envio pelo Twilio, ainda retornamos a mensagem com status "failed"
        return { ...sentMessage, status: "failed", error: twilioError.message };
      }
    } else {
      // Se o Twilio não estiver configurado, usamos o mock
      console.log(`Twilio não configurado. Usando mock.`);
      console.log(
        `[WhatsApp Mock] Enviando mensagem para ${client.whatsapp}: ${processedMessage}`
      );
      if (mediaUrls && mediaUrls.length > 0) {
        console.log(`[WhatsApp Mock] Com anexos: ${mediaUrls.join(", ")}`);
      }

      // Atualizar status da mensagem para "sent"
      console.log(`Atualizando status da mensagem para 'sent'...`);
      const updatedMessage = await prisma.whatsAppMessage.update({
        where: { id: sentMessage.id },
        data: { status: "sent" },
      });
      console.log(`Status atualizado com sucesso`);

      return { ...updatedMessage, mockSent: true };
    }
  } catch (error) {
    console.error(`Erro ao processar mensagem WhatsApp: ${error.message}`);
    console.error(error.stack);
    throw error;
  }
};
