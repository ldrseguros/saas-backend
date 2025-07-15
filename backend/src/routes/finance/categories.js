import express from "express";
import categoryController from "../../controllers/finance/categoryController.js";

const router = express.Router();

// Listar categorias
router.get("/", categoryController.listCategories);
// Criar categoria
router.post("/", categoryController.createCategory);
// Editar categoria
router.put("/:id", categoryController.updateCategory);
// Deletar categoria
router.delete("/:id", categoryController.deleteCategory);

export default router;
