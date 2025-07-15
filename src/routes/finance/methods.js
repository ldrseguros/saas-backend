import express from "express";
import methodController from "../../controllers/finance/methodController.js";

const router = express.Router();

// Listar métodos de pagamento
router.get("/", methodController.listMethods);
// Criar método de pagamento
router.post("/", methodController.createMethod);
// Editar método de pagamento
router.put("/:id", methodController.updateMethod);
// Deletar método de pagamento
router.delete("/:id", methodController.deleteMethod);

export default router;
