import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface OrderAttributes {
  id: number;
  productId: number;
  sellerId: number;
  buyerId: number;
  finalPrice: number;
  status: 'pending_payment' | 'pending_address' | 'pending_shipping' | 'pending_delivery' | 'completed' | 'cancelled';
  paymentMethod?: string;
  paymentTransactionId?: string;
  paymentProof?: string; // URL to payment proof image
  shippingAddress?: string;
  shippingInvoice?: string;
  trackingNumber?: string;
  carrierName?: string;
  cancelledBy?: 'seller' | 'buyer';
  cancellationReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderCreationAttributes extends Optional<OrderAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> { }

export class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  public id!: number;
  public productId!: number;
  public sellerId!: number;
  public buyerId!: number;
  public finalPrice!: number;
  public status!: 'pending_payment' | 'pending_address' | 'pending_shipping' | 'pending_delivery' | 'completed' | 'cancelled';
  public paymentMethod?: string;
  public paymentTransactionId?: string;
  public paymentProof?: string;
  public shippingAddress?: string;
  public shippingInvoice?: string;
  public trackingNumber?: string;
  public carrierName?: string;
  public cancelledBy?: 'seller' | 'buyer';
  public cancellationReason?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    buyerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    finalPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'pending_payment',
        'pending_address',
        'pending_shipping',
        'pending_delivery',
        'completed',
        'cancelled'
      ),
      defaultValue: 'pending_payment',
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentProof: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shippingAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shippingInvoice: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    trackingNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    carrierName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cancelledBy: {
      type: DataTypes.ENUM('seller', 'buyer'),
      allowNull: true,
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'orders',
  }
);

