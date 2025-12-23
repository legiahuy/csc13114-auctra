import { User } from './User.model';
import { Category } from './Category.model';
import { Product } from './Product.model';
import { Bid } from './Bid.model';
import { Watchlist } from './Watchlist.model';
import { Question } from './Question.model';
import { Review } from './Review.model';
import { Order } from './Order.model';
import { ChatMessage } from './ChatMessage.model';
import { Settings } from './Settings.model';

// Define relationships
User.hasMany(Product, { foreignKey: 'sellerId', as: 'products' });
Product.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

User.hasMany(Bid, { foreignKey: 'bidderId', as: 'bids' });
Bid.belongsTo(User, { foreignKey: 'bidderId', as: 'bidder' });

Product.hasMany(Bid, { foreignKey: 'productId', as: 'bids' });
Bid.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

User.hasMany(Watchlist, { foreignKey: 'userId', as: 'watchlist' });
Watchlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Product.hasMany(Watchlist, { foreignKey: 'productId', as: 'watchlist' });
Watchlist.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

User.hasMany(Question, { foreignKey: 'userId', as: 'questions' });
Question.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Product.hasMany(Question, { foreignKey: 'productId', as: 'questions' });
Question.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

User.hasMany(Review, { foreignKey: 'reviewerId', as: 'givenReviews' });
User.hasMany(Review, { foreignKey: 'revieweeId', as: 'receivedReviews' });
Review.belongsTo(User, { foreignKey: 'reviewerId', as: 'reviewer' });
Review.belongsTo(User, { foreignKey: 'revieweeId', as: 'reviewee' });

Product.hasOne(Order, { foreignKey: 'productId', as: 'order' });
Order.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

User.hasMany(Order, { foreignKey: 'sellerId', as: 'sellerOrders' });
User.hasMany(Order, { foreignKey: 'buyerId', as: 'buyerOrders' });
Order.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Order.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });

Order.hasMany(Review, { foreignKey: 'orderId', as: 'reviews' });
Review.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

Order.hasMany(ChatMessage, { foreignKey: 'orderId', as: 'messages' });
ChatMessage.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

export {
  User,
  Category,
  Product,
  Bid,
  Watchlist,
  Question,
  Review,
  Order,
  ChatMessage,
  Settings,
};
