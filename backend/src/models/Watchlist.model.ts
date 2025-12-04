import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface WatchlistAttributes {
  id: number;
  userId: number;
  productId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WatchlistCreationAttributes extends Optional<WatchlistAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class Watchlist extends Model<WatchlistAttributes, WatchlistCreationAttributes> implements WatchlistAttributes {
  public id!: number;
  public userId!: number;
  public productId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Watchlist.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'watchlists',
    indexes: [
      { unique: true, fields: ['userId', 'productId'] },
    ],
  }
);

