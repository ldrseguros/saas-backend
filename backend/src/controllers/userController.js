import {
  fetchAllUsers,
  fetchUserById,
  modifyUser,
  removeUser,
  createNewUser,
} from "../services/userService.js";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt"; // Importar bcrypt para hash de senha, se necessário para criar/atualizar users

const prisma = new PrismaClient();

// @desc    Create a new user (employee or client)
// @route   POST /api/admin/users
// @access  Admin
export const createUser = async (req, res) => {
  const { email, name, role, password, phone, position, whatsapp } = req.body;
  const tenantId = req.user.tenantId; // Obter tenantId do usuário autenticado

  // Basic input validation
  if (!email || !name || !role || !password) {
    return res.status(400).json({
      message: "Email, nome, role e senha são obrigatórios.",
    });
  }

  try {
    const newUser = await createNewUser({
      email,
      name,
      role,
      password,
      phone,
      position,
      whatsapp,
      tenantId,
    });
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error in createUser controller:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Erro ao criar usuário",
    });
  }
};

// @desc    Get all users (employees and clients)
// @route   GET /api/admin/users
// @access  Admin
export const getAllUsers = async (req, res) => {
  const { email, role, page = 1, limit = 10 } = req.query;
  const tenantId = req.user.tenantId; // Obter tenantId do usuário autenticado

  try {
    const result = await fetchAllUsers(
      { email, role, tenantId },
      { page, limit }
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getAllUsers controller:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Erro ao buscar usuários",
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Admin
export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await fetchUserById(id);
    res.status(200).json(user);
  } catch (error) {
    console.error(`Error in getUserById controller (ID: ${id}):`, error);
    res.status(error.statusCode || 500).json({
      message: error.message || `Erro ao buscar usuário com ID ${id}`,
    });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Admin
export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { email, name, role, password, whatsapp, phone, position } = req.body;

  console.log("=== UPDATE USER DEBUG ===");
  console.log("User ID:", id);
  console.log("Request body:", req.body);
  console.log("Extracted data:", {
    email,
    name,
    role,
    password: !!password,
    whatsapp,
    phone,
    position,
  });

  // Basic input validation (can be expanded or moved to middleware)
  if (!email || !name || !role) {
    return res.status(400).json({
      message: "Email, nome e role são obrigatórios para atualização.",
    });
  }

  try {
    const updatedUser = await modifyUser(id, {
      email,
      name,
      role,
      password,
      whatsapp,
      phone,
      position,
    });

    console.log("Updated user result:", updatedUser);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(`Error in updateUser controller (ID: ${id}):`, error);
    // Handle specific errors from service if needed, e.g., unique constraint violation
    // For now, relying on the generic status code from the service error
    res.status(error.statusCode || 500).json({
      message: error.message || `Erro ao atualizar usuário com ID ${id}`,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Admin
export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await removeUser(id);
    res.status(200).json(result); // Service returns { message: "..." }
  } catch (error) {
    console.error(`Error in deleteUser controller (ID: ${id}):`, error);
    res.status(error.statusCode || 500).json({
      message: error.message || `Erro ao deletar usuário com ID ${id}`,
    });
  }
};
