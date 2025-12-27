import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export interface SettingsAttributes {
  id: number;
  key: string;
  value: string;
  description?: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export interface SettingsCreationAttributes
  extends Optional<SettingsAttributes, "id" | "createdAt" | "updatedAt"> {}

export class Settings
  extends Model<SettingsAttributes, SettingsCreationAttributes>
  implements SettingsAttributes
{
  public id!: number;
  public key!: string;
  public value!: string;
  public description?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Settings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "settings",
    timestamps: true,
  }
);

