const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const listCategories = async (filters) => {
  return prisma.category.findMany(filters);
};

const createCategory = async (data) => {
  return prisma.category.create({ data });
};

const updateCategory = async (id, data) => {
  return prisma.category.update({ where: { id }, data });
};

const deleteCategory = async (id) => {
  return prisma.category.delete({ where: { id } });
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
