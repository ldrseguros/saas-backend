import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET; // Esta linha está correta agora, sem o fallback

export const protect = async (req, res, next) => {
  let token;

  console.log("[AuthMiddleware] Iniciando verificação de token."); 

  // Check for token in headers (commonly in the Authorization header as 'Bearer TOKEN')
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    console.log("[AuthMiddleware] Token recebido:", token); 
  }

  // If no token is found
  if (!token) {
    console.log("[AuthMiddleware] ERRO: Nenhum token fornecido."); 
    return res
      .status(401)
      .json({ message: "Não autorizado, token não encontrado" });
  }

  try {
    console.log("[AuthMiddleware] Usando JWT_SECRET para verificar:", JWT_SECRET ? "Chave presente" : "Chave AUSENTE!"); //Verifica se a chave foi carregada

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("[AuthMiddleware] Token decodificado com sucesso:", decoded); 

    // Find the account in the database using the decoded token payload
    const account = await prisma.authAccount.findUnique({
      where: {
        id: decoded.id, // Use the account ID from the JWT payload
      },
      include: {
        employee: true, // Include employee profile if exists
        client: true, // Include client profile if exists
      },
    });

    if (!account) {
      console.log("[AuthMiddleware] ERRO: Conta não encontrada para o ID do token."); 
      return res
        .status(401)
        .json({ message: "Não autorizado, conta não encontrada" });
    }

    // Prepare user object with profile details
    let name = "";
    if (account.role === "CLIENT" && account.client) {
      name = account.client.name;
    } else if (account.employee) {
      name = account.employee.name;
    }

    // Attach user to the request object
    req.user = {
      id: account.id,
      email: account.email,
      name,
      role: account.role,
      tenantId: account.tenantId, 
    };
    console.log("[AuthMiddleware] req.user populado:", req.user); 

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("[AuthMiddleware] ERRO na verificação do token ou busca de usuário:", error); 

    // Diferentes tratamentos de erro para diferentes tipos de falha de JWT
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expirado. Faça login novamente." });
    }

    if (error.name === "JsonWebTokenError") {
      // Este é o erro de 'Invalid Signature' que aparece no jwt.io
      return res
        .status(401)
        .json({ message: "Token inválido. Faça login novamente." });
    }

    res.status(401).json({ message: "Não autorizado, falha no token" });
  }
};

// Middleware para verificar se o usuário é um administrador
export const admin = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "TENANT_ADMIN" || req.user.role === "SUPER_ADMIN")
  ) {
    next();
  } else {
    res.status(403).json({
      message:
        "Acesso negado. Apenas administradores podem acessar este recurso.",
    });
  }
};

export default protect;