import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect } from "../middlewares/authMiddleware.js";
import { authorizeRoles } from "../middlewares/roleMiddleware.js";
import { requireTenantAccess } from "../middlewares/tenantMiddleware.js";
import {
  getAllServices,
  createService,
  getServiceById,
  updateService,
  deleteService,
  getPublicServices,
} from "../controllers/serviceController.js";

const router = express.Router();

// Configuração do Multer para armazenamento de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), "uploads", "services");

    // Criar o diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Gerar nome de arquivo único com timestamp e extensão original
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "service-" + uniqueSuffix + ext);
  },
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Formato de arquivo não suportado. Use JPEG, PNG, WEBP ou GIF."
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter,
});

// Public route - does not require authentication or admin role
router.get("/", getPublicServices); // GET /api/services

// Rota para upload de imagem
router.post(
  "/admin/upload",
  protect,
  authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN"),
  upload.single("image"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      // Caminho relativo para acessar a imagem
      const filePath = `/uploads/services/${req.file.filename}`;

      res.status(200).json({
        message: "Imagem enviada com sucesso",
        imagePath: filePath,
        fileName: req.file.filename,
      });
    } catch (error) {
      console.error("Erro no upload de imagem:", error);
      res.status(500).json({ message: "Erro ao processar o upload da imagem" });
    }
  }
);

// Admin routes - require authentication and ADMIN role
router
  .route("/admin")
  .all(
    protect,
    requireTenantAccess,
    authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN")
  ) // Apply middleware to all methods on this path
  .get(getAllServices) // GET /api/services/admin
  .post(createService); // POST /api/services/admin

router
  .route("/admin/:id")
  .all(
    protect,
    requireTenantAccess,
    authorizeRoles("TENANT_ADMIN", "SUPER_ADMIN")
  ) // Apply middleware to all methods on this path
  .get(getServiceById) // GET /api/services/admin/:id
  .put(updateService) // PUT /api/services/admin/:id
  .delete(deleteService); // DELETE /api/services/admin/:id

export default router;
