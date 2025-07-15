// backend/src/middlewares/tenantAuthMiddleware.js
export const authorizeTenantAccess = (req, res, next) => {
 
    if (req.user && req.user.role === 'SUPER_ADMIN') {
        console.log("[TenantAuth] Super Admin detectado, pulando verificação de tenant.");
        return next();
    }

    if (!req.user || !req.user.tenantId) {
        console.warn("[TenantAuth] Tentativa de acesso sem usuário autenticado ou tenantId no token.");
        return res.status(401).json({ message: "Não autorizado: Credenciais de tenant ausentes." });
    }

    if (!req.tenantId) {
        console.warn(`[TenantAuth] Tentativa de acesso para subdomínio inválido ou não encontrado: ${req.hostname}`);
        return res.status(404).json({ message: "Recurso não encontrado ou não disponível para este subdomínio." });
    }

    if (req.user.tenantId !== req.tenantId) {
        console.warn(`[TenantAuth] Acesso Proibido: Usuário '${req.user.id}' (Tenant do Token: '${req.user.tenantId}') tentou acessar Tenant da URL: '${req.tenantId}' via subdomínio '${req.hostname}'`);
        return res.status(403).json({ message: "Acesso Proibido: Você não tem permissão para acessar este recurso neste domínio." });
    }

    console.log(`[TenantAuth] Acesso autorizado para usuário '${req.user.id}' no Tenant '${req.user.tenantId}'.`);
    next(); 
};