import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database";

export interface ProductAttributes {
  id: number;
  name: string;
  slug: string;
  description: string;
  nameNoDiacritics: string;
  descriptionNoDiacritics: string;
  startingPrice: number;
  currentPrice: number;
  bidStep: number;
  buyNowPrice?: number;
  categoryId: number;
  sellerId: number;
  mainImage: string;
  images: string[]; // JSON array of image URLs
  startDate: Date;
  endDate: Date;
  status: "active" | "ended" | "cancelled";
  autoExtend: boolean;
  allowUnratedBidders: boolean;
  bidCount: number;
  viewCount: number;
  isNew: boolean; // true if posted within N minutes
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductCreationAttributes
  extends Optional<
    ProductAttributes,
    | "id"
    | "currentPrice"
    | "status"
    | "bidCount"
    | "viewCount"
    | "isNew"
    | "createdAt"
    | "updatedAt"
  > {}

export class Product
  extends Model<ProductAttributes, ProductCreationAttributes>
  implements ProductAttributes
{
  public id!: number;
  public name!: string;
  public slug!: string;
  public description!: string;
  public nameNoDiacritics!: string;
  public descriptionNoDiacritics!: string;
  public startingPrice!: number;
  public currentPrice!: number;
  public bidStep!: number;
  public buyNowPrice?: number;
  public categoryId!: number;
  public sellerId!: number;
  public mainImage!: string;
  public images!: string[];
  public startDate!: Date;
  public endDate!: Date;
  public status!: "active" | "ended" | "cancelled";
  public autoExtend!: boolean;
  public allowUnratedBidders!: boolean;
  public bidCount!: number;
  public viewCount!: number;
  public isNew!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Product.init(
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
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    nameNoDiacritics: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
    descriptionNoDiacritics: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    startingPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    currentPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    bidStep: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    buyNowPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "categories",
        key: "id",
      },
    },
    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    mainImage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    images: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "ended", "cancelled"),
      defaultValue: "active",
      allowNull: false,
    },
    autoExtend: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    allowUnratedBidders: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    bidCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    isNew: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "products",
  }
);
