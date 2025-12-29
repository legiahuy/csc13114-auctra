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

const router = Router();

// Configure multer for file uploads - using memory storage for Supabase
const upload = multer({
  storage: multer.memoryStorage(),
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
