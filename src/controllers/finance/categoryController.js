import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const listCategories = async (req, res) => {
  try {
    const { tenantId } = req.query;
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: "asc" },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, color, tenantId } = req.body;
    const category = await prisma.category.create({
      data: { name, color, tenantId },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const category = await prisma.category.update({
      where: { id },
      data: { name, color },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
