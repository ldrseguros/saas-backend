import prisma from "../lib/prisma.js";

/**
 * Middleware para identificar o tenant baseado no subdomínio ou em um header
 * Adiciona o tenant ao objeto request para uso nos controllers
 */
export const tenantMiddleware = async (req, res, next) => {
  try {
    // Pular identificação de tenant para rotas públicas e de superadmin
    if (
      req.path.startsWith("/api/public") ||
      req.path.startsWith("/api/auth") ||
      req.path.startsWith("/api/superadmin")
    ) {
      return next();
    }

    // Obter o tenant do header ou do subdomínio
    const tenantId = req.headers["x-tenant-id"];
    const host = req.headers.host;
    let subdomain = null;

    // Extrair subdomínio se presente
    if (host && host.includes(".")) {
      subdomain = host.split(".")[0];
      // Ignorar 'www' como subdomínio
      if (subdomain === "www") {
        subdomain = null;
      }
    }

    // Se não há tenantId ou subdomínio, continuar (será tratado nas rotas protegidas)
    if (!tenantId && !subdomain) {
      return next();
    }

    // Buscar tenant por ID ou subdomínio
    let tenant = null;
    if (tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });
    } else if (subdomain) {
      tenant = await prisma.tenant.findUnique({
        where: { subdomain },
      });
    }

    // Se encontrou o tenant, adiciona ao request
    if (tenant) {
      req.tenant = tenant;
    }

    next();
  } catch (error) {
    console.error("Erro no middleware de tenant:", error);
    next(error);
  }
};

/**
 * Middleware para verificar se o usuário tem acesso ao tenant
 * Deve ser usado após middleware de autenticação
 */
export const requireTenantAccess = async (req, res, next) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    // Superadmin tem acesso a todos os tenants
    if (req.user.role === "SUPER_ADMIN") {
      return next();
    }

    // Para usuários comuns, identificar tenant através do tenantId do usuário
    if (!req.user.tenantId) {
      return res
        .status(400)
        .json({ message: "Usuário não está associado a nenhum tenant" });
    }

    // Buscar informações do tenant do usuário
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant não encontrado" });
    }

    // Adicionar tenant ao request
    req.tenant = tenant;

    // Verificar se o tenant está ativo
    if (!tenant.isActive) {
      return res.status(403).json({ message: "Este tenant está inativo" });
    }

    // Verificar status da assinatura
    if (
      tenant.subscriptionStatus === "EXPIRED" ||
      tenant.subscriptionStatus === "CANCELED"
    ) {
      return res.status(402).json({
        message: "Assinatura expirada ou cancelada",
        subscriptionStatus: tenant.subscriptionStatus,
      });
    }

    next();
  } catch (error) {
    console.error("Erro ao verificar acesso ao tenant:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

/**
 * Middleware para verificar se o usuário é admin do tenant
 * Deve ser usado após middleware de autenticação e requireTenantAccess
 */
export const requireTenantAdmin = async (req, res, next) => {
  try {
    // Verificar se o usuário é SUPER_ADMIN ou TENANT_ADMIN
    if (req.user.role !== "SUPER_ADMIN" && req.user.role !== "TENANT_ADMIN") {
      return res
        .status(403)
        .json({ message: "Acesso restrito a administradores" });
    }

    next();
  } catch (error) {
    console.error("Erro ao verificar permissão de admin:", error);
    next(error);
  }
};

/**
 * Middleware para verificar se o usuário é superadmin
 * Deve ser usado após middleware de autenticação
 */
export const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    if (req.user.role !== "SUPER_ADMIN") {
      return res
        .status(403)
        .json({ message: "Acesso restrito a super administradores" });
    }

    next();
  } catch (error) {
    console.error("Erro ao verificar permissão de superadmin:", error);
    next(error);
  }
};
