import express from "express";
import transactionController from "../../controllers/finance/transactionController.js";

const router = express.Router();

// Listar transações
router.get("/", transactionController.listTransactions);
// Criar transação
router.post("/", transactionController.createTransaction);
// Editar transação
router.put("/:id", transactionController.updateTransaction);
// Deletar transação
router.delete("/:id", transactionController.deleteTransaction);
// Dashboard financeiro
router.get("/dashboard", transactionController.dashboard);

export default router;
