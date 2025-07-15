const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const listTransactions = async (filters) => {
  return prisma.transaction.findMany(filters);
};

const createTransaction = async (data) => {
  return prisma.transaction.create({ data });
};

const updateTransaction = async (id, data) => {
  return prisma.transaction.update({ where: { id }, data });
};

const deleteTransaction = async (id) => {
  return prisma.transaction.delete({ where: { id } });
};

module.exports = {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
