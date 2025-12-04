import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface BidAttributes {
  id: number;
  productId: number;
  bidderId: number;
  amount: number;
  maxAmount?: number; // For auto-bidding
  isAutoBid: boolean;
  isRejected: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BidCreationAttributes extends Optional<BidAttributes, 'id' | 'isAutoBid' | 'isRejected' | 'createdAt' | 'updatedAt'> {}

export class Bid extends Model<BidAttributes, BidCreationAttributes> implements BidAttributes {
  public id!: number;
  public productId!: number;
  public bidderId!: number;
  public amount!: number;
  public maxAmount?: number;
  public isAutoBid!: boolean;
  public isRejected!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Bid.init(
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
    bidderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    maxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    isAutoBid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    isRejected: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'bids',
    indexes: [
      { fields: ['productId'] },
      { fields: ['bidderId'] },
      { fields: ['createdAt'] },
    ],
  }
);

