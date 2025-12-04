import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface QuestionAttributes {
  id: number;
  productId: number;
  userId: number;
  question: string;
  answer?: string;
  answeredAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QuestionCreationAttributes extends Optional<QuestionAttributes, 'id' | 'answer' | 'answeredAt' | 'createdAt' | 'updatedAt'> {}

export class Question extends Model<QuestionAttributes, QuestionCreationAttributes> implements QuestionAttributes {
  public id!: number;
  public productId!: number;
  public userId!: number;
  public question!: string;
  public answer?: string;
  public answeredAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Question.init(
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    answeredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'questions',
  }
);

