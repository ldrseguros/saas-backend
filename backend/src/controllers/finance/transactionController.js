import { PrismaClient } from "@prisma/client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
const prisma = new PrismaClient();

const listTransactions = async (req, res) => {
  try {
    const { tenantId, type, categoryId, methodId, startDate, endDate } =
      req.query;
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (methodId) where.methodId = methodId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }
    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true, method: true },
      orderBy: { date: "desc" },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { type, description, value, date, categoryId, methodId, tenantId } =
      req.body;
    const transaction = await prisma.transaction.create({
      data: { type, description, value, date, categoryId, methodId, tenantId },
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description, value, date, categoryId, methodId } = req.body;
    const transaction = await prisma.transaction.update({
      where: { id },
      data: { type, description, value, date, categoryId, methodId },
    });
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.transaction.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const dashboard = async (req, res) => {
  try {
    const { tenantId, months = 6 } = req.query;
    if (!tenantId) {
      return res.status(400).json({ error: "tenantId é obrigatório" });
    }
    // Período: últimos N meses
    const now = new Date();
    const start = startOfMonth(subMonths(now, months - 1));
    const end = endOfMonth(now);

    // Buscar todas as transações do período
    const transactions = await prisma.transaction.findMany({
      where: {
        tenantId,
        date: {
          gte: start,
          lte: end,
        },
      },
    });

    // Totais gerais
    const totalIncome = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((acc, t) => acc + t.value, 0);
    const totalExpense = transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((acc, t) => acc + t.value, 0);
    const balance = totalIncome - totalExpense;

    // Agrupar por mês
    const chartDataMap = {};
    for (let i = 0; i < months; i++) {
      const d = subMonths(now, months - 1 - i);
      const key = format(d, "yyyy-MM");
      chartDataMap[key] = { period: key, income: 0, expense: 0 };
    }
    transactions.forEach((t) => {
      const key = format(new Date(t.date), "yyyy-MM");
      if (chartDataMap[key]) {
        if (t.type === "INCOME") chartDataMap[key].income += t.value;
        if (t.type === "EXPENSE") chartDataMap[key].expense += t.value;
      }
    });
    const chartData = Object.values(chartDataMap);

    res.json({ totalIncome, totalExpense, balance, chartData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  dashboard,
};
