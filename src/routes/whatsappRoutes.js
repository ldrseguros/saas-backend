import express from "express";
import {
  getTemplates,
  getTemplateById,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  createReport,
  getReportByBookingId,
  sendMessage,
  uploadPhoto,
  testWhatsAppConnection,
  sendTestMessage,
} from "../controllers/whatsappController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Apply middlewares to all routes
router.use(protect);
router.use(authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"));

// Templates de mensagens
router.route("/templates").get(getTemplates).post(createMessageTemplate);

router
  .route("/templates/:id")
  .get(getTemplateById)
  .put(updateMessageTemplate)
  .delete(deleteMessageTemplate);

// Relatórios de serviço
router.route("/reports").post(createReport);

router.route("/reports/:bookingId").get(getReportByBookingId);

// Envio de mensagens
router.route("/send").post(sendMessage);

// Upload de fotos
router.route("/upload").post(uploadPhoto);

// Teste de conexão WhatsApp
router.route("/test").get(testWhatsAppConnection);

// Envio de mensagem de teste
router.route("/test-send").post(sendTestMessage);

export default router;
