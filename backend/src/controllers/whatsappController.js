import {
  getWhatsAppTemplates,
  getWhatsAppTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  saveServiceReport,
  getServiceReportByBookingId,
  sendWhatsAppMessage,
  uploadImage,
  createServiceReport,
} from "../services/whatsappService.js";
import twilio from "twilio";

// @desc    Obter todos os templates de mensagens WhatsApp
// @route   GET /api/admin/whatsapp/templates
// @access  Admin
export const getTemplates = async (req, res) => {
  try {
    const templates = await getWhatsAppTemplates();
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching WhatsApp templates:", error);
    // Logar detalhes adicionais do erro se disponíveis
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    // Enviar uma resposta de erro mais detalhada para o frontend (sem expor informações sensíveis)
    res.status(error.statusCode || 500).json({
      message: "Erro ao buscar templates de mensagens",
      error: error.message || "Erro interno do servidor",
    });
  }
};

// @desc    Obter template por ID
// @route   GET /api/admin/whatsapp/templates/:id
// @access  Admin
export const getTemplateById = async (req, res) => {
  const { id } = req.params;

  try {
    const template = await getWhatsAppTemplateById(id);
    if (!template) {
      return res.status(404).json({ message: "Template não encontrado" });
    }
    res.status(200).json(template);
  } catch (error) {
    console.error("Erro ao buscar template:", error);
    res
      .status(500)
      .json({ message: "Erro ao buscar template", error: error.message });
  }
};

// @desc    Criar novo template de mensagem
// @route   POST /api/admin/whatsapp/templates
// @access  Admin
export const createMessageTemplate = async (req, res) => {
  const { name, message, type } = req.body;

  if (!name || !message || !type) {
    return res.status(400).json({
      message: "Nome, mensagem e tipo são obrigatórios para criar um template",
    });
  }

  try {
    const newTemplate = await createTemplate({
      name,
      message,
      type,
    });

    res.status(201).json(newTemplate);
  } catch (error) {
    console.error("Error in createTemplate controller:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Erro ao criar template de mensagem",
    });
  }
};

// @desc    Atualizar template existente
// @route   PUT /api/admin/whatsapp/templates/:id
// @access  Admin
export const updateMessageTemplate = async (req, res) => {
  const { id } = req.params;
  const { name, message, type } = req.body;

  if (!name && !message && !type) {
    return res.status(400).json({
      message:
        "Pelo menos um campo (nome, mensagem ou tipo) deve ser fornecido para atualização",
    });
  }

  try {
    const updatedTemplate = await updateTemplate(id, {
      name,
      message,
      type,
    });

    if (!updatedTemplate) {
      return res.status(404).json({ message: "Template não encontrado" });
    }

    res.status(200).json(updatedTemplate);
  } catch (error) {
    console.error("Erro ao atualizar template de mensagem:", error);
    res.status(500).json({
      message: "Erro ao atualizar template de mensagem",
      error: error.message,
    });
  }
};

// @desc    Excluir template
// @route   DELETE /api/admin/whatsapp/templates/:id
// @access  Admin
export const deleteMessageTemplate = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await deleteTemplate(id);
    if (!result) {
      return res.status(404).json({ message: "Template não encontrado" });
    }
    res.status(200).json({ message: "Template excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir template de mensagem:", error);
    res.status(500).json({
      message: "Erro ao excluir template de mensagem",
      error: error.message,
    });
  }
};

// @desc    Salvar relatório de serviço com fotos
// @route   POST /api/admin/whatsapp/reports
// @access  Admin
export const createReport = async (req, res) => {
  const { bookingId, beforePhotos, afterPhotos, comments } = req.body;

  if (!bookingId || !beforePhotos || !afterPhotos) {
    return res.status(400).json({
      message: "ID do agendamento, fotos antes e depois são obrigatórios",
    });
  }

  try {
    const result = await createServiceReport(
      bookingId,
      beforePhotos || [],
      afterPhotos || [],
      comments
    );

    res.status(201).json(result);
  } catch (error) {
    console.error("Erro ao criar relatório de serviço:", error);
    res.status(500).json({
      message: "Erro ao criar relatório de serviço",
      error: error.message,
    });
  }
};

// @desc    Obter relatório de serviço por ID de agendamento
// @route   GET /api/admin/whatsapp/reports/:bookingId
// @access  Admin
export const getReportByBookingId = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const report = await getServiceReportByBookingId(bookingId);
    res.status(200).json(report);
  } catch (error) {
    console.error(
      `Error in getReportByBookingId controller (BookingID: ${bookingId}):`,
      error
    );
    res.status(error.statusCode || 500).json({
      message:
        error.message ||
        `Erro ao buscar relatório para o agendamento ${bookingId}`,
    });
  }
};

// @desc    Enviar mensagem WhatsApp para cliente
// @route   POST /api/admin/whatsapp/send
// @access  Admin
export const sendMessage = async (req, res) => {
  const { clientId, message, mediaUrls, templateData } = req.body;

  if (!clientId || !message) {
    return res.status(400).json({
      message: "ID do cliente e mensagem são obrigatórios",
    });
  }

  try {
    const result = await sendWhatsAppMessage({
      clientId,
      message,
      mediaUrls: mediaUrls || [],
      templateData,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao enviar mensagem WhatsApp:", error);
    res.status(500).json({
      message: "Erro ao enviar mensagem WhatsApp",
      error: error.message,
    });
  }
};

// @desc    Upload de foto para relatório de serviço
// @route   POST /api/admin/whatsapp/upload
// @access  Admin
export const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }

    const imageUrl = await uploadImage(req.file);
    res.status(201).json({ imageUrl });
  } catch (error) {
    console.error("Erro ao fazer upload de imagem:", error);
    res.status(500).json({
      message: "Erro ao fazer upload de imagem",
      error: error.message,
    });
  }
};

// @desc    Testar conexão com WhatsApp
// @route   GET /api/admin/whatsapp/test
// @access  Admin
export const testWhatsAppConnection = async (req, res) => {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !twilioWhatsappNumber) {
      return res.status(400).json({
        message: "Configuração do Twilio incompleta",
        config: {
          accountSid: accountSid ? "Configurado" : "Não configurado",
          authToken: authToken ? "Configurado" : "Não configurado",
          twilioWhatsappNumber: twilioWhatsappNumber || "Não configurado",
        },
      });
    }

    // Se chegou até aqui, as configurações básicas estão presentes
    res.status(200).json({
      message: "Configuração do Twilio encontrada",
      twilioWhatsappNumber,
    });
  } catch (error) {
    console.error("Erro ao testar conexão WhatsApp:", error);
    res.status(500).json({
      message: "Erro ao testar conexão WhatsApp",
      error: error.message,
    });
  }
};

// @desc    Enviar mensagem de teste
// @route   POST /api/admin/whatsapp/test-send
// @access  Admin
export const sendTestMessage = async (req, res) => {
  const { phoneNumber, message, useTemplateVars } = req.body;

  if (!phoneNumber || !message) {
    return res.status(400).json({
      message: "Número de telefone e mensagem são obrigatórios",
    });
  }

  try {
    // Verificar se as variáveis de ambiente estão configuradas
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !twilioWhatsappNumber) {
      return res.status(400).json({
        message: "Configuração do Twilio incompleta",
        config: {
          accountSid: accountSid ? "Configurado" : "Não configurado",
          authToken: authToken ? "Configurado" : "Não configurado",
          twilioWhatsappNumber: twilioWhatsappNumber || "Não configurado",
        },
      });
    }

    // Formatar o número para o formato do WhatsApp
    const formattedNumber = phoneNumber.replace(/\D/g, "");
    const withCountryCode = formattedNumber.startsWith("55")
      ? formattedNumber
      : `55${formattedNumber}`;
    const whatsappNumber = `whatsapp:+${withCountryCode}`;

    console.log(`Enviando mensagem de teste para ${whatsappNumber}`);

    // Processar variáveis de template se solicitado
    let processedMessage = message;
    if (useTemplateVars) {
      // Importar a função de substituição de variáveis
      const { replaceTemplateVariables } = await import(
        "../services/whatsappService.js"
      );

      // Dados de exemplo para teste
      const templateData = {
        client_name: "Cliente Teste",
        service_name: "Lavagem Premium",
        date: new Date().toLocaleDateString("pt-BR"),
        time: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      processedMessage = replaceTemplateVariables(message, templateData);
      console.log(`Mensagem original: ${message}`);
      console.log(`Mensagem processada: ${processedMessage}`);
    }

    // Inicializar cliente Twilio
    const client = twilio(accountSid, authToken);

    // Enviar mensagem
    const twilioMessage = await client.messages.create({
      from: twilioWhatsappNumber,
      to: whatsappNumber,
      body: processedMessage,
    });

    res.status(200).json({
      message: "Mensagem de teste enviada com sucesso",
      twilioSid: twilioMessage.sid,
      to: whatsappNumber,
      status: twilioMessage.status,
      originalMessage: message,
      processedMessage: processedMessage,
    });
  } catch (error) {
    console.error("Erro ao enviar mensagem de teste:", error);
    res.status(500).json({
      message: "Erro ao enviar mensagem de teste",
      error: error.message,
    });
  }
};
