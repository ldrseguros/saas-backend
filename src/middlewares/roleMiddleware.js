export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log("[RoleMiddleware] Iniciando autorização de papel."); 
    console.log("[RoleMiddleware] req.user:", req.user); 
    console.log("[RoleMiddleware] Papel do usuário (req.user.role):", req.user?.role); 
    console.log("[RoleMiddleware] Papéis permitidos:", allowedRoles); 

    if (!req.user || !req.user.role) {
      console.log("[RoleMiddleware] ERRO: Usuário não autenticado ou sem papel. Acesso negado."); 
      return res.status(403).json({ message: "Acesso negado: Você não possui a permissão necessária." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[RoleMiddleware] ERRO: Papel do usuário '${req.user.role}' não permitido. Acesso negado.`); 
      return res.status(403).json({ message: "Acesso negado: Você não possui a permissão necessária." });
    }

    console.log("[RoleMiddleware] Papel permitido. Prosseguindo."); 
    next();
  };
};