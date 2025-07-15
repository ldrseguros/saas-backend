import nodemailer from "nodemailer";

// Configuração do transporter
const createTransporter = () => {
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT;
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailHost || !emailUser || !emailPass) {
    console.warn(
      "Configurações de email não encontradas. Usando modo de simulação."
    );
    return null;
  }

  return nodemailer.createTransporter({
    host: emailHost,
    port: parseInt(emailPort) || 587,
    secure: false,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

// 🎨 TEMPLATES PARA CLIENTES DAS ESTÉTICAS (B2C)
const businessEmailTemplates = {
  // ================================
  // 📋 AGENDAMENTOS
  // ================================

  bookingConfirmation: {
    subject: "✅ Agendamento Confirmado - {businessName}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">✅ Agendamento Confirmado!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {clientName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Seu agendamento foi confirmado com sucesso. Confira os detalhes:
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #dc2626; margin-top: 0;">📋 Detalhes do Agendamento</h3>
            <p><strong>🛠️ Serviço:</strong> {serviceName}</p>
            <p><strong>📅 Data:</strong> {date}</p>
            <p><strong>🕐 Horário:</strong> {time}</p>
            <p><strong>🚗 Veículo:</strong> {vehicleInfo}</p>
            <p><strong>💰 Valor:</strong> R$ {price}</p>
          </div>
          
          <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="color: #047857; margin-top: 0;">📍 Localização</h3>
            <p style="color: #065f46; margin: 0;">
              <strong>{businessName}</strong><br/>
              {businessAddress}<br/>
              📞 {businessPhone}
            </p>
          </div>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>💡 Dica:</strong> Chegue com 10 minutos de antecedência. 
              Em caso de cancelamento, avise com pelo menos 2 horas de antecedência.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #9ca3af; font-size: 12px;">
              Aguardamos você! 🚗✨
            </p>
          </div>
        </div>
      </div>
    `,
  },

  bookingReminder: {
    subject: "⏰ Lembrete: Seu agendamento é amanhã - {businessName}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #047857); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">⏰ Lembrete de Agendamento</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {clientName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Este é um lembrete de que você tem um agendamento marcado para <strong>amanhã</strong>:
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #059669; margin-top: 0;">📋 Detalhes do Agendamento</h3>
            <p><strong>🛠️ Serviço:</strong> {serviceName}</p>
            <p><strong>📅 Data:</strong> {date}</p>
            <p><strong>🕐 Horário:</strong> {time}</p>
            <p><strong>🚗 Veículo:</strong> {vehicleInfo}</p>
          </div>
          
          <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="color: #047857; margin-top: 0;">📍 Onde estamos</h3>
            <p style="color: #065f46; margin: 0;">
              <strong>{businessName}</strong><br/>
              {businessAddress}<br/>
              📞 {businessPhone}
            </p>
          </div>
          
          <div style="background: #fee2e2; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <p style="color: #991b1b; margin: 0; font-size: 14px;">
              <strong>⚠️ Cancelamento:</strong> Se precisar cancelar, entre em contato conosco com antecedência mínima de 2 horas.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #059669; font-weight: bold;">
              Estamos ansiosos para cuidar do seu veículo! 🚗💎
            </p>
          </div>
        </div>
      </div>
    `,
  },

  serviceCompleted: {
    subject: "✅ Serviço Concluído com Sucesso - {businessName}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">✅ Serviço Concluído!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {clientName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Seu serviço foi concluído com sucesso! Esperamos que tenha ficado satisfeito com o resultado.
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #7c3aed; margin-top: 0;">📋 Resumo do Serviço</h3>
            <p><strong>🛠️ Serviço:</strong> {serviceName}</p>
            <p><strong>📅 Data:</strong> {date}</p>
            <p><strong>🚗 Veículo:</strong> {vehicleInfo}</p>
            <p><strong>💰 Valor:</strong> R$ {price}</p>
            <p><strong>👨‍🔧 Responsável:</strong> {employeeName}</p>
          </div>
          
          <div style="background: #ede9fe; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #7c3aed;">
            <h3 style="color: #5b21b6; margin-top: 0;">⭐ Avalie nosso serviço</h3>
            <p style="color: #5b21b6; margin: 0;">
              Sua opinião é muito importante para nós! Que tal avaliar o serviço e deixar um comentário?
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{reviewUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-right: 10px;">
              ⭐ Avaliar Serviço
            </a>
            <a href="{scheduleAgainUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              📅 Agendar Novamente
            </a>
          </div>
          
          <div style="background: #ecfdf5; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #059669;">
            <p style="color: #047857; margin: 0; font-size: 14px;">
              <strong>💡 Dica:</strong> Para manter seu veículo sempre impecável, recomendamos agendar o próximo serviço em {nextServiceDays} dias.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Agradecemos pela confiança! Volte sempre. 🚗✨
          </p>
        </div>
      </div>
    `,
  },

  // ================================
  // 🎁 MARKETING E FIDELIDADE
  // ================================

  loyaltyReward: {
    subject: "🎁 Parabéns! Você ganhou uma recompensa - {businessName}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎁 Recompensa Desbloqueada!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Parabéns, {clientName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Você completou <strong>{servicesCount} serviços</strong> conosco e ganhou uma recompensa especial!
          </p>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0;">🎯 Sua Recompensa:</h3>
            <p style="color: #92400e; margin: 0; font-size: 18px; font-weight: bold;">
              {rewardDescription}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background: white; border: 2px dashed #f59e0b; border-radius: 8px; padding: 20px;">
              <h3 style="color: #d97706; margin: 0;">Código do Cupom</h3>
              <p style="color: #92400e; font-size: 24px; font-weight: bold; margin: 10px 0; letter-spacing: 2px;">
                {couponCode}
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                Válido até {expirationDate}
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{scheduleUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              🎁 Usar Recompensa
            </a>
          </div>
        </div>
      </div>
    `,
  },

  birthdayDiscount: {
    subject:
      "🎂 Feliz Aniversário! Temos um desconto especial - {businessName}",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ec4899, #be185d); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎂 Feliz Aniversário!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Parabéns, {clientName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Hoje é seu dia especial e queremos comemorar com você! 🎉
          </p>
          
          <div style="background: #fdf2f8; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ec4899;">
            <h3 style="color: #be185d; margin-top: 0;">🎁 Presente de Aniversário:</h3>
            <p style="color: #be185d; margin: 0; font-size: 18px; font-weight: bold;">
              {discountPercent}% DE DESCONTO em qualquer serviço!
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background: white; border: 2px solid #ec4899; border-radius: 8px; padding: 20px;">
              <h3 style="color: #be185d; margin: 0;">🎂 Cupom Aniversário</h3>
              <p style="color: #be185d; font-size: 24px; font-weight: bold; margin: 10px 0; letter-spacing: 2px;">
                ANIVERSARIO{discountPercent}
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                Válido por 30 dias
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{scheduleUrl}" style="display: inline-block; background: #ec4899; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              🎂 Agendar com Desconto
            </a>
          </div>
        </div>
      </div>
    `,
  },
};

// Função para substituir variáveis no template
const replaceVariables = (template, variables) => {
  let subject = template.subject;
  let html = template.html;

  Object.keys(variables).forEach((key) => {
    const value = variables[key] || "";
    const regex = new RegExp(`{${key}}`, "g");
    subject = subject.replace(regex, value);
    html = html.replace(regex, value);
  });

  return { subject, html };
};

// Função principal para enviar email
export const sendBusinessEmail = async (to, templateType, variables) => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      // Modo simulação
      console.log("📧 [BUSINESS EMAIL SIMULADO]");
      console.log(`Para: ${to}`);
      console.log(`Template: ${templateType}`);
      console.log(`Variáveis:`, variables);
      return { success: true, simulated: true };
    }

    const template = businessEmailTemplates[templateType];
    if (!template) {
      throw new Error(`Template Business ${templateType} não encontrado`);
    }

    const { subject, html } = replaceVariables(template, variables);

    const mailOptions = {
      from: `"${variables.businessName}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`📧 [BUSINESS] Email enviado: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Erro ao enviar email Business:", error);
    throw new Error(`Falha no envio de email Business: ${error.message}`);
  }
};

// ================================
// 📋 FUNÇÕES ESPECÍFICAS PARA CLIENTES
// ================================

export const sendBookingConfirmation = async (clientEmail, bookingData) => {
  const variables = {
    clientName: bookingData.clientName,
    serviceName: bookingData.serviceName,
    date: bookingData.date,
    time: bookingData.time,
    vehicleInfo: bookingData.vehicleInfo,
    price: bookingData.price,
    businessName: bookingData.businessName,
    businessAddress: bookingData.businessAddress || "Endereço da estética",
    businessPhone: bookingData.businessPhone,
  };

  return await sendBusinessEmail(clientEmail, "bookingConfirmation", variables);
};

export const sendBookingReminder = async (clientEmail, bookingData) => {
  const variables = {
    clientName: bookingData.clientName,
    serviceName: bookingData.serviceName,
    date: bookingData.date,
    time: bookingData.time,
    vehicleInfo: bookingData.vehicleInfo,
    businessName: bookingData.businessName,
    businessAddress: bookingData.businessAddress || "Endereço da estética",
    businessPhone: bookingData.businessPhone,
  };

  return await sendBusinessEmail(clientEmail, "bookingReminder", variables);
};

export const sendServiceCompleted = async (clientEmail, serviceData) => {
  const variables = {
    clientName: serviceData.clientName,
    serviceName: serviceData.serviceName,
    date: serviceData.date,
    vehicleInfo: serviceData.vehicleInfo,
    price: serviceData.price,
    businessName: serviceData.businessName,
    employeeName: serviceData.employeeName || "Nossa equipe",
    reviewUrl: serviceData.reviewUrl || "#",
    scheduleAgainUrl: serviceData.scheduleAgainUrl || "#",
    nextServiceDays: serviceData.nextServiceDays || "30",
  };

  return await sendBusinessEmail(clientEmail, "serviceCompleted", variables);
};

export const sendLoyaltyReward = async (clientEmail, rewardData) => {
  const variables = {
    clientName: rewardData.clientName,
    servicesCount: rewardData.servicesCount,
    rewardDescription: rewardData.rewardDescription,
    couponCode: rewardData.couponCode,
    expirationDate: rewardData.expirationDate,
    scheduleUrl: rewardData.scheduleUrl || "#",
    businessName: rewardData.businessName,
  };

  return await sendBusinessEmail(clientEmail, "loyaltyReward", variables);
};

export const sendBirthdayDiscount = async (clientEmail, birthdayData) => {
  const variables = {
    clientName: birthdayData.clientName,
    discountPercent: birthdayData.discountPercent || "20",
    scheduleUrl: birthdayData.scheduleUrl || "#",
    businessName: birthdayData.businessName,
  };

  return await sendBusinessEmail(clientEmail, "birthdayDiscount", variables);
};

// ================================
// 🔧 UTILITÁRIOS
// ================================

export const getBusinessEmailTemplates = () => {
  return {
    booking: [
      {
        key: "bookingConfirmation",
        name: "✅ Confirmação de agendamento",
        description: "Enviado quando agendamento é confirmado",
      },
      {
        key: "bookingReminder",
        name: "⏰ Lembrete de agendamento",
        description: "Enviado antes do agendamento",
      },
      {
        key: "serviceCompleted",
        name: "✅ Serviço concluído",
        description: "Enviado quando serviço é finalizado",
      },
    ],
    marketing: [
      {
        key: "loyaltyReward",
        name: "🎁 Recompensa de fidelidade",
        description: "Enviado quando cliente completa X serviços",
      },
      {
        key: "birthdayDiscount",
        name: "🎂 Desconto de aniversário",
        description: "Enviado no aniversário do cliente",
      },
    ],
  };
};
