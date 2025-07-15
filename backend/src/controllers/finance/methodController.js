import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const listMethods = async (req, res) => {
  try {
    const { tenantId } = req.query;
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    const methods = await prisma.paymentMethod.findMany({
      where,
      orderBy: { name: "asc" },
    });
    res.json(methods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createMethod = async (req, res) => {
  try {
    const { name, tenantId } = req.body;
    const method = await prisma.paymentMethod.create({
      data: { name, tenantId },
    });
    res.status(201).json(method);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const method = await prisma.paymentMethod.update({
      where: { id },
      data: { name },
    });
    res.json(method);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteMethod = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.paymentMethod.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  listMethods,
  createMethod,
  updateMethod,
  deleteMethod,
};
