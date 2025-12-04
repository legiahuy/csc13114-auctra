import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ChatMessageAttributes {
  id: number;
  orderId: number;
  senderId: number;
  message: string;
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChatMessageCreationAttributes extends Optional<ChatMessageAttributes, 'id' | 'isRead' | 'createdAt' | 'updatedAt'> {}

export class ChatMessage extends Model<ChatMessageAttributes, ChatMessageCreationAttributes> implements ChatMessageAttributes {
  public id!: number;
  public orderId!: number;
  public senderId!: number;
  public message!: string;
  public isRead!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ChatMessage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id',
      },
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'chat_messages',
    indexes: [
      { fields: ['orderId'] },
      { fields: ['createdAt'] },
    ],
  }
);

