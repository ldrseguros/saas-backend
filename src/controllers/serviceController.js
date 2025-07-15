import {
  findAllServices,
  addNewService,
  findServiceById,
  modifyService,
  removeService,
} from "../services/serviceService.js";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// @desc    Get all services
// @route   GET /api/admin/services
// @access  Admin
export const getAllServices = async (req, res) => {
  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user?.tenantId;
    console.log(`[getAllServices] Tenant ID recebido do req:${tenantId}`);

    if(!tenantId){
      return res
      .status(401)
      .json({ message: "TenantId não encontrado para o usuário autenticado."});
    }

    const services = await findAllServices(tenantId);
    res.status(200).json(services);
  } catch (error) {
    console.error("Error in getAllServices controller:", error);
    // Consider more specific error handling or a generic error handler middleware
    res
      .status(500)
      .json({ message: "Error fetching services", error: error.message });
  }
};

// @desc    Get all services for public view
// @route   GET /api/services
// @access  Public
export const getPublicServices = async (req, res) => {
  try {
    // Para services públicos, precisamos do tenantId do header ou subdomínio
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId é obrigatório para serviços públicos" });
    }

    const services = await findAllServices(tenantId);
    res.status(200).json(services);
  } catch (error) {
    console.error("Error in getPublicServices controller:", error);
    res
      .status(500)
      .json({ message: "Error fetching services", error: error.message });
  }
};

// @desc    Create a new service
// @route   POST /api/admin/services
// @access  Admin
export const createService = async (req, res) => {
  const { title, description, price, duration, imageSrc } = req.body;

  // Basic validation remains in controller or moves to middleware
  if (!title || price === undefined) {
    return res.status(400).json({ message: "Title and price are required." });
  }

  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const newService = await addNewService({
      title,
      description,
      price,
      duration,
      imageSrc,
      tenantId,
    });
    res.status(201).json(newService);
  } catch (error) {
    console.error("Error in createService controller:", error);
    // Handle specific errors, e.g., Prisma's P2002 for unique constraint violation if not handled in service
    if (error.code === "P2002" && error.meta?.target?.includes("title")) {
      return res
        .status(409)
        .json({ message: "A service with this title already exists." });
    }
    res
      .status(500)
      .json({ message: "Error creating service", error: error.message });
  }
};

// @desc    Get a single service by ID
// @route   GET /api/admin/services/:id
// @access  Admin
export const getServiceById = async (req, res) => {
  const { id } = req.params;
  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user?.tenantId;
    console.log(`[getServiceById] Tenant ID recebido do req.user:${tenantId}`);

    if (!tenantId) {
      return res
        .status(401)
        .json({ message: "TenantId não encontrado para o usuário autenticado."});
    }

    const service = await findServiceById(id, tenantId);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.status(200).json(service);
  } catch (error) {
    console.error(`Error in getServiceById controller (ID: ${id}):`, error);
    res.status(500).json({
      message: `Error fetching service with ID ${id}`,
      error: error.message,
    });
  }
};

// @desc    Update a service by ID
// @route   PUT /api/admin/services/:id
// @access  Admin
export const updateService = async (req, res) => {
  const { id } = req.params;
  const { title, description, price, duration, imageSrc } = req.body;

  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    const existingService = await findServiceById(id, tenantId);
    if (!existingService) {
      return res
        .status(404)
        .json({ message: "Service not found, cannot update." });
    }

    // Se a imagem mudou, exclui a antiga
    if (
      existingService.imageSrc &&
      imageSrc &&
      existingService.imageSrc !== imageSrc
    ) {
      const oldImagePath = path.join(
        process.cwd(),
        existingService.imageSrc.startsWith("/uploads")
          ? existingService.imageSrc.substring(1)
          : existingService.imageSrc
      );
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const updatedService = await modifyService(
      id,
      {
        title,
        description,
        price,
        duration,
        imageSrc,
      },
      tenantId
    );
    res.status(200).json(updatedService);
  } catch (error) {
    console.error(`Error in updateService controller (ID: ${id}):`, error);
    if (error.code === "P2002" && error.meta?.target?.includes("title")) {
      return res
        .status(409)
        .json({ message: "A service with this title already exists." });
    }
    res.status(500).json({
      message: `Error updating service with ID ${id}`,
      error: error.message,
    });
  }
};

// @desc    Delete a service by ID
// @route   DELETE /api/admin/services/:id
// @access  Admin
export const deleteService = async (req, res) => {
  const { id } = req.params;
  try {
    // Obter tenantId do usuário autenticado
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res
        .status(400)
        .json({ message: "TenantId não encontrado no usuário" });
    }

    // Verifica se existe algum agendamento vinculado a este serviço (mesmo tenant)
    const bookingsWithService = await prisma.bookingService.findMany({
      where: {
        serviceId: id,
        booking: {
          tenantId: tenantId, // FILTRO POR TENANT
        },
      },
    });
    if (bookingsWithService.length > 0) {
      return res.status(400).json({
        message:
          "Não é possível deletar este serviço pois ele está vinculado a agendamentos.",
      });
    }
    // Se não houver vínculos, pode deletar normalmente
    await removeService(id, tenantId);
    res.status(200).json({ message: "Serviço deletado com sucesso." });
  } catch (error) {
    console.error(`Error in deleteService controller (ID: ${id}):`, error);
    res.status(500).json({ message: "Erro ao deletar serviço" });
  }
};
