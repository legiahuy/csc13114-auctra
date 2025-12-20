import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export interface CategoryAttributes {
  id: number;
  name: string;
  slug: string;
  parentId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryCreationAttributes
  extends Optional<
    CategoryAttributes,
    "id" | "parentId" | "createdAt" | "updatedAt"
  > {}

export class Category
  extends Model<CategoryAttributes, CategoryCreationAttributes>
  implements CategoryAttributes
{
  public id!: number;
  public name!: string;
  public slug!: string;
  public parentId?: number;
  public children?: Category[];
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "categories",
        key: "id",
      },
    },
  },
  {
    sequelize,
    tableName: "categories",
  }
);

// Self-referential relationship
Category.hasMany(Category, { foreignKey: "parentId", as: "children" });
Category.belongsTo(Category, { foreignKey: "parentId", as: "parent" });
