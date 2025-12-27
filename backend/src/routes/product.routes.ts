import { Router } from "express";
import {
  getHomepageProducts,
  getProducts,
  getProductById,
  createProduct,
  updateProductDescription,
  deleteProduct,
  getMyProducts,
  getSellerOrders,
} from "../controllers/product.controller";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/auth.middleware";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "product-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "5242880"), // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Public routes
router.get("/homepage", getHomepageProducts);
router.get("/", getProducts);
router.get("/:id", optionalAuthenticate, getProductById);

// Seller routes
router.post(
  "/",
  authenticate,
  authorize("seller"),
  upload.array("images", 10),
  createProduct
);

router.put("/:id/description", authenticate, updateProductDescription);

// Seller routes
router.get(
  "/seller/my-products",
  authenticate,
  authorize("seller"),
  getMyProducts
);
router.get(
  "/seller/orders",
  authenticate,
  authorize("seller"),
  getSellerOrders
);

// Admin routes
router.delete("/:id", authenticate, authorize("admin"), deleteProduct);

export default router;
