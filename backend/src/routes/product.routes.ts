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

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management and browsing
 */

/**
 * @swagger
 * /api/products/homepage:
 *   get:
 *     summary: Get products for homepage (featured, ending soon, etc.)
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Homepage products data
 */
router.get("/homepage", getHomepageProducts);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Search and browse products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
router.get("/", getProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product details
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
router.get("/:id", optionalAuthenticate, getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Seller only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - startingPrice
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               startingPrice:
 *                 type: number
 *               categoryId:
 *                 type: integer
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product created
 *       403:
 *         description: Only sellers can create products
 */
router.post(
  "/",
  authenticate,
  authorize("seller"),
  upload.array("images", 10),
  createProduct
);

/**
 * @swagger
 * /api/products/{id}/description:
 *   put:
 *     summary: Update product description (Seller only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Description updated
 */
router.put("/:id/description", authenticate, updateProductDescription);

/**
 * @swagger
 * /api/products/seller/my-products:
 *   get:
 *     summary: Get products listed by the current seller
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of seller's products
 */
router.get(
  "/seller/my-products",
  authenticate,
  authorize("seller"),
  getMyProducts
);

/**
 * @swagger
 * /api/products/seller/orders:
 *   get:
 *     summary: Get orders received by the seller
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
router.get(
  "/seller/orders",
  authenticate,
  authorize("seller"),
  getSellerOrders
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product deleted
 *       403:
 *         description: Admin access required
 */
router.delete("/:id", authenticate, authorize("admin"), deleteProduct);

export default router;
