import {
  registerNewClient,
  authenticateUser,
  registerNewEmployee,
} from "../services/authService.js";

// Basic auth controller functions

export const registerClient = async (req, res) => {
  console.log("Dados recebidos para registro do CLIENTE no controller:", req.body);
  const { email, password, name, whatsapp } = req.body;

  const tenantId = req.tenantId;

  // Basic validation (can be expanded or moved to middleware)
  if (!email || !password || !name) {
    return res
      .status(400)
      .json({ message: "Email, senha e nome são obrigatórios." });
  }

  if(!tenantId){
    console.error("Erro: tenantId não encontrado no request para registro de cliente.");
    return res.status(400).json({message: "Tenant não identificado para registro."});
  }

  try {
    const clientProfile = await registerNewClient({
      email,
      password,
      name,
      whatsapp,
      tenantId,
    });
    console.log("Cliente registrado com sucesso pelo serviço:", clientProfile);
    res.status(201).json({
      message: "Cliente cadastrado com sucesso.",
      client: clientProfile,
    });
  } catch (error) {
    console.error("Erro no controller de registro de cliente:", {
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack,
      body: req.body,
    });
    res.status(error.statusCode || 500).json({
      message: error.message || "Erro no cadastro de cliente.",
      details:
        process.env.NODE_ENV === "development" && !error.statusCode
          ? error.stack
          : undefined,
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    const loginResult = await authenticateUser({ email, password });
    res.status(200).json(loginResult);
  } catch (error) {
    console.error("Erro no controller de login:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Erro ao fazer login.",
    });
  }
};

// Register new employee (Admin only - protection should be handled at route level)
export const registerEmployee = async (req, res) => {
  const { email, password, name, role } = req.body;

  // Basic validation
  if (!email || !password || !name || !role) {
    return res
      .status(400)
      .json({ message: "Email, senha, nome e role são obrigatórios." });
  }
  // Further role validation can be in service or here

  try {
    const employeeProfile = await registerNewEmployee({
      email,
      password,
      name,
      role,
    });
    res.status(201).json({
      message: "Funcionário cadastrado com sucesso.",
      employee: employeeProfile,
    });
  } catch (error) {
    console.error("Erro no controller de registro de funcionário:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Erro no cadastro de funcionário.",
    });
  }
};
