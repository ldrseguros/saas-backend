const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const listMethods = async (filters) => {
  return prisma.paymentMethod.findMany(filters);
};

const createMethod = async (data) => {
  return prisma.paymentMethod.create({ data });
};

const updateMethod = async (id, data) => {
  return prisma.paymentMethod.update({ where: { id }, data });
};

const deleteMethod = async (id) => {
  return prisma.paymentMethod.delete({ where: { id } });
};

module.exports = {
  listMethods,
  createMethod,
  updateMethod,
  deleteMethod,
};
