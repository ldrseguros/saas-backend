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

// 🎨 TEMPLATES PARA DONOS DAS ESTÉTICAS (B2B)
const saasEmailTemplates = {
  // ================================
  // 🚀 ONBOARDING E CADASTRO
  // ================================

  welcomeEmail: {
    subject: "🎉 Bem-vindo ao SaaS Estética Automotiva!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #047857); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Bem-vindo(a)!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {ownerName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            É com muito prazer que te recebemos no <strong>SaaS Estética Automotiva</strong>! 
            Você acabou de dar o primeiro passo para transformar a gestão do seu negócio.
          </p>
          
          <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="color: #047857; margin-top: 0;">🚀 Seus primeiros 7 dias são GRÁTIS!</h3>
            <p style="color: #065f46; margin: 0;">
              Teste todas as funcionalidades sem compromisso. Você só será cobrado após o período de teste.
            </p>
          </div>

          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #059669; margin-top: 0;">✅ Próximos passos recomendados:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Configure os dados da sua estética</li>
              <li style="margin-bottom: 8px;">Cadastre seus serviços e preços</li>
              <li style="margin-bottom: 8px;">Adicione seus funcionários</li>
              <li style="margin-bottom: 8px;">Cadastre seus primeiros clientes</li>
              <li style="margin-bottom: 8px;">Configure WhatsApp e Email</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{dashboardUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Começar Agora
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Precisa de ajuda? Responda este email ou acesse nosso suporte.
          </p>
        </div>
      </div>
    `,
  },

  tutorialFirstSteps: {
    subject: "📖 Guia Rápido: Como configurar sua estética em 5 minutos",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📖 Guia de Configuração</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {ownerName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Para te ajudar a aproveitar ao máximo nossa plataforma, preparamos um guia rápido de configuração:
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #7c3aed; margin-top: 0;">🎯 Configuração em 5 passos:</h3>
            
            <div style="margin-bottom: 15px; padding: 15px; background: #f8fafc; border-radius: 6px;">
              <strong>1. 🏢 Dados da Estética</strong><br/>
              <span style="color: #6b7280;">Configure nome, endereço, telefone e horários de funcionamento</span>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background: #f8fafc; border-radius: 6px;">
              <strong>2. 🛠️ Serviços e Preços</strong><br/>
              <span style="color: #6b7280;">Cadastre seus serviços (lavagem, enceramento, etc.) com valores</span>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background: #f8fafc; border-radius: 6px;">
              <strong>3. 👥 Equipe</strong><br/>
              <span style="color: #6b7280;">Adicione seus funcionários e defina permissões</span>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background: #f8fafc; border-radius: 6px;">
              <strong>4. 📱 WhatsApp</strong><br/>
              <span style="color: #6b7280;">Configure as notificações automáticas via WhatsApp</span>
            </div>
            
            <div style="margin-bottom: 15px; padding: 15px; background: #f8fafc; border-radius: 6px;">
              <strong>5. 📧 Email</strong><br/>
              <span style="color: #6b7280;">Configure o envio de emails para seus clientes</span>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{dashboardUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Começar Configuração
            </a>
          </div>
        </div>
      </div>
    `,
  },

  // ================================
  // ⏰ TRIAL E CONVERSÃO
  // ================================

  trialReminder7Days: {
    subject: "⏰ Seu teste gratuito expira em 7 dias",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">⏰ 7 dias restantes</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {ownerName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Seu período de teste gratuito expira em <strong>7 dias</strong> ({expirationDate}). 
            Para continuar usando todas as funcionalidades, escolha um plano que mais se adequa ao seu negócio.
          </p>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0;">📊 Seu uso até agora:</h3>
            <ul style="color: #92400e; margin: 0; padding-left: 20px;">
              <li>✅ {bookingsCount} agendamentos realizados</li>
              <li>✅ {clientsCount} clientes cadastrados</li>
              <li>✅ {servicesCount} serviços configurados</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{upgradeUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Escolher Plano
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Não perca suas configurações! Assine agora e continue aproveitando.
          </p>
        </div>
      </div>
    `,
  },

  trialReminder1Day: {
    subject: "🚨 ÚLTIMO DIA do seu teste gratuito!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🚨 ÚLTIMO DIA!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {ownerName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            <strong>Hoje é o último dia</strong> do seu teste gratuito. Seu acesso expira às 23:59h.
            Para não perder suas configurações e continuar gerenciando sua estética, assine agora!
          </p>
          
          <div style="background: #fee2e2; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #991b1b; margin-top: 0;">⚠️ O que acontece se não assinar:</h3>
            <ul style="color: #991b1b; margin: 0; padding-left: 20px;">
              <li>❌ Perda de acesso ao sistema</li>
              <li>❌ Dados ficam inacessíveis</li>
              <li>❌ Clientes não conseguem agendar</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{upgradeUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
              🚀 ASSINAR AGORA
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Tem dúvidas? Responda este email e nossa equipe te ajudará!
          </p>
        </div>
      </div>
    `,
  },

  trialExpired: {
    subject: "❌ Seu teste gratuito expirou - Como continuar?",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6b7280, #4b5563); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">⏰ Teste Expirado</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {ownerName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Seu período de teste gratuito expirou, mas <strong>seus dados estão seguros</strong>! 
            Você tem até 30 dias para assinar um plano e reativar sua conta.
          </p>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #6b7280;">
            <h3 style="color: #374151; margin-top: 0;">💾 Seus dados estão preservados:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>✅ {bookingsCount} agendamentos</li>
              <li>✅ {clientsCount} clientes</li>
              <li>✅ {servicesCount} serviços</li>
              <li>✅ Todas as configurações</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{upgradeUrl}" style="display: inline-block; background: #059669; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Reativar Minha Conta
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            Oferta especial: Use o cupom <strong>VOLTA10</strong> e ganhe 10% de desconto no primeiro mês!
          </p>
        </div>
      </div>
    `,
  },

  // ================================
  // 💳 GESTÃO DE PAGAMENTOS
  // ================================

  subscriptionConfirmation: {
    subject: "✅ Assinatura ativada - Bem-vindo ao {planName}!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #047857); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Assinatura Ativada!</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {ownerName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Parabéns! Sua assinatura do plano <strong>{planName}</strong> foi ativada com sucesso. 
            Agora você tem acesso a todas as funcionalidades do nosso sistema de gestão para estética automotiva.
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #059669; margin-top: 0;">Detalhes da Assinatura</h3>
            <p><strong>Plano:</strong> {planName}</p>
            <p><strong>Valor:</strong> R$ {planPrice}/mês</p>
            <p><strong>Data de início:</strong> {startDate}</p>
            <p><strong>Próxima cobrança:</strong> {nextBilling}</p>
            <p><strong>Funcionários permitidos:</strong> {maxEmployees}</p>
            <p><strong>Clientes permitidos:</strong> {maxClients}</p>
          </div>

          <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="color: #047857; margin-top: 0;">🚀 Próximos passos:</h3>
            <ul style="color: #065f46; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Configure seus serviços e preços</li>
              <li style="margin-bottom: 8px;">Cadastre seus funcionários</li>
              <li style="margin-bottom: 8px;">Adicione seus primeiros clientes</li>
              <li style="margin-bottom: 8px;">Configure as integrações WhatsApp e Email</li>
              <li style="margin-bottom: 8px;">Personalize as cores da sua estética</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{dashboardUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Acessar Painel Administrativo
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Precisa de ajuda? Nossa equipe de suporte está disponível em <strong>suporte@saasestetica.com</strong>
          </p>
        </div>
      </div>
    `,
  },

  paymentFailed: {
    subject: "❌ Problema no pagamento da sua assinatura",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">❌ Falha no Pagamento</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {ownerName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Houve um problema ao processar o pagamento da sua assinatura. 
            Para evitar a suspensão dos serviços, atualize seu método de pagamento.
          </p>
          
          <div style="background: #fee2e2; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #991b1b; margin-top: 0;">⚠️ Detalhes:</h3>
            <p style="color: #991b1b; margin: 0;">
              <strong>Valor:</strong> R$ {planPrice}<br/>
              <strong>Plano:</strong> {planName}<br/>
              <strong>Tentativa:</strong> {attemptDate}<br/>
              <strong>Motivo:</strong> {failureReason}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{updatePaymentUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Atualizar Pagamento
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Importante:</strong> Sua conta será suspensa em {suspensionDate} se o pagamento não for regularizado.
          </p>
        </div>
      </div>
    `,
  },

  invoiceAvailable: {
    subject: "📄 Sua fatura de {month} está disponível",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #047857); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📄 Fatura Disponível</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {ownerName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Sua fatura de <strong>{month}</strong> já está disponível para download.
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #059669; margin-top: 0;">💳 Detalhes da Fatura</h3>
            <p><strong>Período:</strong> {billingPeriod}</p>
            <p><strong>Plano:</strong> {planName}</p>
            <p><strong>Valor:</strong> R$ {planPrice}</p>
            <p><strong>Vencimento:</strong> {dueDate}</p>
            <p><strong>Status:</strong> {paymentStatus}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{invoiceUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              📄 Baixar Fatura
            </a>
          </div>
        </div>
      </div>
    `,
  },

  // ================================
  // ❌ CANCELAMENTO E WINBACK
  // ================================

  subscriptionCancelled: {
    subject: "❌ Assinatura cancelada - Sentiremos sua falta",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6b7280, #4b5563); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">😢 Cancelamento Confirmado</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {ownerName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Confirmamos o cancelamento da sua assinatura. Você terá acesso completo até <strong>{accessUntil}</strong>.
          </p>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #6b7280;">
            <h3 style="color: #374151; margin-top: 0;">📊 Resumo da sua jornada:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>⏱️ {subscriptionDuration} como nosso cliente</li>
              <li>📅 {totalBookings} agendamentos processados</li>
              <li>👥 {totalClients} clientes atendidos</li>
              <li>💰 R$ {totalRevenue} em faturamento gerenciado</li>
            </ul>
          </div>
          
          <div style="background: #ecfdf5; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #059669;">
            <h3 style="color: #047857; margin-top: 0;">💾 Backup dos seus dados</h3>
            <p style="color: #065f46; margin: 0;">
              Seus dados estarão disponíveis para download por 90 dias. 
              Após esse período, eles serão permanentemente removidos.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{downloadDataUrl}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              📄 Baixar Meus Dados
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Mudou de ideia? Você pode reativar sua conta a qualquer momento respondendo este email.
          </p>
        </div>
      </div>
    `,
  },

  winbackOffer: {
    subject: "🎁 Que tal voltar? Oferta especial para você!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed, #5b21b6); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎁 Oferta Especial</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #374151; margin-bottom: 20px;">Olá, {ownerName}!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Sentimos muito sua falta! Preparamos uma oferta especial para você voltar:
          </p>
          
          <div style="background: #ede9fe; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #7c3aed;">
            <h3 style="color: #5b21b6; margin-top: 0;">🎯 Oferta Limitada:</h3>
            <ul style="color: #5b21b6; margin: 0; padding-left: 20px;">
              <li>💰 <strong>50% de desconto</strong> nos primeiros 3 meses</li>
              <li>🚀 Migração gratuita dos seus dados</li>
              <li>📞 Suporte prioritário por 30 dias</li>
              <li>🎁 Configuração personalizada inclusa</li>
            </ul>
          </div>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <h3 style="color: #7c3aed; margin-top: 0;">📈 Novidades que você perdeu:</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              <li>✅ Novo sistema de fidelidade para clientes</li>
              <li>✅ Relatórios financeiros avançados</li>
              <li>✅ Integração com redes sociais</li>
              <li>✅ App mobile para clientes</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{winbackUrl}?code=VOLTA50" style="display: inline-block; background: #7c3aed; color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              🚀 Aproveitar Oferta
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            Oferta válida até {offerExpiry}. Use o código <strong>VOLTA50</strong>.
          </p>
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
export const sendSaasEmail = async (to, templateType, variables) => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      // Modo simulação
      console.log("📧 [SaaS EMAIL SIMULADO]");
      console.log(`Para: ${to}`);
      console.log(`Template: ${templateType}`);
      console.log(`Variáveis:`, variables);
      return { success: true, simulated: true };
    }

    const template = saasEmailTemplates[templateType];
    if (!template) {
      throw new Error(`Template SaaS ${templateType} não encontrado`);
    }

    const { subject, html } = replaceVariables(template, variables);

    const mailOptions = {
      from: `"SaaS Estética Automotiva" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`📧 [SaaS] Email enviado: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Erro ao enviar email SaaS:", error);
    throw new Error(`Falha no envio de email SaaS: ${error.message}`);
  }
};

// ================================
// 🚀 FUNÇÕES ESPECÍFICAS PARA DONOS
// ================================

export const sendWelcomeEmail = async (ownerEmail, userData) => {
  const variables = {
    ownerName: userData.ownerName,
    dashboardUrl:
      userData.dashboardUrl || "http://localhost:8080/admin/dashboard",
  };

  return await sendSaasEmail(ownerEmail, "welcomeEmail", variables);
};

export const sendTutorialFirstSteps = async (ownerEmail, userData) => {
  const variables = {
    ownerName: userData.ownerName,
    dashboardUrl:
      userData.dashboardUrl || "http://localhost:8080/admin/dashboard",
  };

  return await sendSaasEmail(ownerEmail, "tutorialFirstSteps", variables);
};

export const sendTrialReminder7Days = async (ownerEmail, trialData) => {
  const variables = {
    ownerName: trialData.ownerName,
    expirationDate: trialData.expirationDate,
    bookingsCount: trialData.bookingsCount || 0,
    clientsCount: trialData.clientsCount || 0,
    servicesCount: trialData.servicesCount || 0,
    upgradeUrl:
      trialData.upgradeUrl || "http://localhost:8080/admin/subscription",
  };

  return await sendSaasEmail(ownerEmail, "trialReminder7Days", variables);
};

export const sendTrialReminder1Day = async (ownerEmail, trialData) => {
  const variables = {
    ownerName: trialData.ownerName,
    upgradeUrl:
      trialData.upgradeUrl || "http://localhost:8080/admin/subscription",
  };

  return await sendSaasEmail(ownerEmail, "trialReminder1Day", variables);
};

export const sendTrialExpired = async (ownerEmail, trialData) => {
  const variables = {
    ownerName: trialData.ownerName,
    bookingsCount: trialData.bookingsCount || 0,
    clientsCount: trialData.clientsCount || 0,
    servicesCount: trialData.servicesCount || 0,
    upgradeUrl:
      trialData.upgradeUrl || "http://localhost:8080/admin/subscription",
  };

  return await sendSaasEmail(ownerEmail, "trialExpired", variables);
};

export const sendSubscriptionConfirmation = async (
  ownerEmail,
  subscriptionData
) => {
  const variables = {
    ownerName: subscriptionData.ownerName,
    planName: subscriptionData.planName,
    planPrice: subscriptionData.planPrice,
    startDate: subscriptionData.startDate,
    nextBilling: subscriptionData.nextBilling,
    maxEmployees: subscriptionData.maxEmployees,
    maxClients: subscriptionData.maxClients || "Ilimitados",
    dashboardUrl:
      subscriptionData.dashboardUrl || "http://localhost:8080/admin/dashboard",
  };

  return await sendSaasEmail(ownerEmail, "subscriptionConfirmation", variables);
};

export const sendPaymentFailed = async (ownerEmail, paymentData) => {
  const variables = {
    ownerName: paymentData.ownerName,
    planPrice: paymentData.planPrice,
    planName: paymentData.planName,
    attemptDate: paymentData.attemptDate,
    failureReason: paymentData.failureReason,
    suspensionDate: paymentData.suspensionDate,
    updatePaymentUrl:
      paymentData.updatePaymentUrl ||
      "http://localhost:8080/admin/subscription",
  };

  return await sendSaasEmail(ownerEmail, "paymentFailed", variables);
};

export const sendInvoiceAvailable = async (ownerEmail, invoiceData) => {
  const variables = {
    ownerName: invoiceData.ownerName,
    month: invoiceData.month,
    billingPeriod: invoiceData.billingPeriod,
    planName: invoiceData.planName,
    planPrice: invoiceData.planPrice,
    dueDate: invoiceData.dueDate,
    paymentStatus: invoiceData.paymentStatus,
    invoiceUrl: invoiceData.invoiceUrl,
  };

  return await sendSaasEmail(ownerEmail, "invoiceAvailable", variables);
};

export const sendSubscriptionCancelled = async (ownerEmail, cancelData) => {
  const variables = {
    ownerName: cancelData.ownerName,
    accessUntil: cancelData.accessUntil,
    subscriptionDuration: cancelData.subscriptionDuration,
    totalBookings: cancelData.totalBookings || 0,
    totalClients: cancelData.totalClients || 0,
    totalRevenue: cancelData.totalRevenue || "0,00",
    downloadDataUrl:
      cancelData.downloadDataUrl || "http://localhost:8080/admin/data-export",
  };

  return await sendSaasEmail(ownerEmail, "subscriptionCancelled", variables);
};

export const sendWinbackOffer = async (ownerEmail, offerData) => {
  const variables = {
    ownerName: offerData.ownerName,
    offerExpiry: offerData.offerExpiry,
    winbackUrl:
      offerData.winbackUrl || "http://localhost:8080/admin/subscription",
  };

  return await sendSaasEmail(ownerEmail, "winbackOffer", variables);
};

// ================================
// 🧪 FUNÇÕES DE TESTE
// ================================

export const sendTestEmail = async (toEmail, testData = {}) => {
  const variables = {
    ownerName: testData.ownerName || "Teste",
    dashboardUrl:
      testData.dashboardUrl || "http://localhost:8080/admin/dashboard",
  };

  console.log(`📧 [TESTE] Enviando email de teste para: ${toEmail}`);
  return await sendSaasEmail(toEmail, "welcomeEmail", variables);
};

export const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      return {
        success: true,
        mode: "simulation",
        message:
          "Email configurado em modo simulação (variáveis de ambiente não definidas)",
      };
    }

    // Testar conexão
    await transporter.verify();

    return {
      success: true,
      mode: "smtp",
      message: "Configuração de email válida",
    };
  } catch (error) {
    return {
      success: false,
      mode: "error",
      message: `Erro na configuração: ${error.message}`,
    };
  }
};
