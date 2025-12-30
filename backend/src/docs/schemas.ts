/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the user
 *         fullName:
 *           type: string
 *           description: The full name of the user
 *         email:
 *           type: string
 *           description: The email of the user
 *         role:
 *           type: string
 *           enum: [bidder, seller, admin]
 *           description: The role of the user
 *         avatar:
 *           type: string
 *           description: URL to user avatar
 *         address:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         rating:
 *           type: number
 *           description: User rating score
 *         totalRatings:
 *           type: integer
 *       example:
 *         id: 1
 *         fullName: John Doe
 *         email: john@example.com
 *         role: bidder
 *         rating: 4.5
 *         totalRatings: 10
 *
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         startingPrice:
 *           type: number
 *         currentPrice:
 *           type: number
 *         buyNowPrice:
 *           type: number
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [active, ended, cancelled]
 *         categoryId:
 *           type: integer
 *         sellerId:
 *           type: integer
 *         images:
 *           type: array
 *           items:
 *             type: string
 *       example:
 *         id: 1
 *         name: Vintage Camera
 *         description: A rare vintage camera in good condition.
 *         startingPrice: 100
 *         currentPrice: 150
 *         status: active
 *
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         slug:
 *           type: string
 *         parentId:
 *           type: integer
 *           nullable: true
 *       example:
 *         id: 1
 *         name: Electronics
 *         slug: electronics
 *         parentId: null
 *
 *     Bid:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         amount:
 *           type: number
 *         productId:
 *           type: integer
 *         bidderId:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: 1
 *         amount: 150
 *         productId: 1
 *         bidderId: 2
 *         createdAt: 2023-12-01T12:00:00Z
 *
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         productId:
 *           type: integer
 *         buyerId:
 *           type: integer
 *         sellerId:
 *           type: integer
 *         finalPrice:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending_payment, pending_address, pending_shipping, pending_delivery, completed, cancelled]
 *         shippingAddress:
 *           type: string
 *       example:
 *         id: 1
 *         productId: 1
 *         finalPrice: 150
 *         status: pending_shipping
 *         shippingAddress: 123 Main St, NY
 *
 *     Error:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         message:
 *           type: string
 *           example: Error message description
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Login successful
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             token:
 *               type: string
 *               description: JWT access token
 */
