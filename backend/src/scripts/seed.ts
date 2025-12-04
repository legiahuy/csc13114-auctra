import { sequelize } from "../config/database";
import { User, Category, Product, Bid } from "../models/index";
import { createSlug } from "../utils/vietnamese.util";

const seed = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    // Sync database
    await sequelize.sync({ force: true });
    console.log("Database synced");

    // Create admin user
    const admin = await User.create({
      email: "admin@auction.com",
      password: "admin123",
      fullName: "Admin User",
      address: "123 Admin Street",
      role: "admin",
      isEmailVerified: true,
      rating: 0,
      totalRatings: 0,
    });

    // Create seller users
    const seller1 = await User.create({
      email: "seller1@auction.com",
      password: "seller123",
      fullName: "Nguyễn Văn A",
      address: "123 Seller Street",
      role: "seller",
      isEmailVerified: true,
      rating: 8,
      totalRatings: 10,
    });

    const seller2 = await User.create({
      email: "seller2@auction.com",
      password: "seller123",
      fullName: "Trần Thị B",
      address: "456 Seller Avenue",
      role: "seller",
      isEmailVerified: true,
      rating: 9,
      totalRatings: 10,
    });

    // Create bidder users
    const bidder1 = await User.create({
      email: "bidder1@auction.com",
      password: "bidder123",
      fullName: "Lê Văn C",
      address: "789 Bidder Road",
      role: "bidder",
      isEmailVerified: true,
      rating: 8,
      totalRatings: 10,
    });

    const bidder2 = await User.create({
      email: "bidder2@auction.com",
      password: "bidder123",
      fullName: "Phạm Thị D",
      address: "321 Bidder Lane",
      role: "bidder",
      isEmailVerified: true,
      rating: 9,
      totalRatings: 10,
    });

    const bidder3 = await User.create({
      email: "bidder3@auction.com",
      password: "bidder123",
      fullName: "Hoàng Văn E",
      address: "654 Bidder Street",
      role: "bidder",
      isEmailVerified: true,
      rating: 7,
      totalRatings: 10,
    });

    // Create categories
    const electronics = await Category.create({
      name: "Điện tử",
      slug: "dien-tu",
    });

    const phones = await Category.create({
      name: "Điện thoại di động",
      slug: "dien-thoai-di-dong",
      parentId: electronics.id,
    });

    const laptops = await Category.create({
      name: "Máy tính xách tay",
      slug: "may-tinh-xach-tay",
      parentId: electronics.id,
    });

    const fashion = await Category.create({
      name: "Thời trang",
      slug: "thoi-trang",
    });

    const shoes = await Category.create({
      name: "Giày",
      slug: "giay",
      parentId: fashion.id,
    });

    const watches = await Category.create({
      name: "Đồng hồ",
      slug: "dong-ho",
      parentId: fashion.id,
    });

    // Create products
    const products = [
      {
        name: "iPhone 15 Pro Max 256GB",
        description:
          "iPhone 15 Pro Max mới, chưa sử dụng, còn bảo hành Apple. Máy đẹp như mới, fullbox đầy đủ phụ kiện.",
        startingPrice: 25000000,
        bidStep: 500000,
        buyNowPrice: 30000000,
        categoryId: phones.id,
        sellerId: seller1.id,
        mainImage: "https://via.placeholder.com/800x600?text=iPhone+15+Pro+Max",
        images: [
          "https://via.placeholder.com/800x600?text=iPhone+15+Pro+Max+1",
          "https://via.placeholder.com/800x600?text=iPhone+15+Pro+Max+2",
          "https://via.placeholder.com/800x600?text=iPhone+15+Pro+Max+3",
        ],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        autoExtend: true,
      },
      {
        name: "Samsung Galaxy S24 Ultra 512GB",
        description:
          "Samsung Galaxy S24 Ultra màu đen, máy mới 99%, còn bảo hành chính hãng. Fullbox đầy đủ.",
        startingPrice: 22000000,
        bidStep: 500000,
        buyNowPrice: 28000000,
        categoryId: phones.id,
        sellerId: seller2.id,
        mainImage: "https://via.placeholder.com/800x600?text=Samsung+S24+Ultra",
        images: [
          "https://via.placeholder.com/800x600?text=Samsung+S24+Ultra+1",
          "https://via.placeholder.com/800x600?text=Samsung+S24+Ultra+2",
          "https://via.placeholder.com/800x600?text=Samsung+S24+Ultra+3",
        ],
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        autoExtend: false,
      },
      {
        name: "MacBook Pro 14 inch M3 Pro",
        description:
          "MacBook Pro 14 inch chip M3 Pro, RAM 18GB, SSD 512GB. Máy mới, chưa sử dụng, còn bảo hành Apple.",
        startingPrice: 45000000,
        bidStep: 1000000,
        buyNowPrice: 55000000,
        categoryId: laptops.id,
        sellerId: seller1.id,
        mainImage: "https://via.placeholder.com/800x600?text=MacBook+Pro+M3",
        images: [
          "https://via.placeholder.com/800x600?text=MacBook+Pro+M3+1",
          "https://via.placeholder.com/800x600?text=MacBook+Pro+M3+2",
          "https://via.placeholder.com/800x600?text=MacBook+Pro+M3+3",
        ],
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "Nike Air Jordan 1 Retro High OG",
        description:
          "Giày Nike Air Jordan 1 size 42, màu đỏ đen trắng. Giày chính hãng, mới 100%, còn hộp.",
        startingPrice: 5000000,
        bidStep: 200000,
        buyNowPrice: 7000000,
        categoryId: shoes.id,
        sellerId: seller2.id,
        mainImage: "https://via.placeholder.com/800x600?text=Nike+Jordan+1",
        images: [
          "https://via.placeholder.com/800x600?text=Nike+Jordan+1+1",
          "https://via.placeholder.com/800x600?text=Nike+Jordan+1+2",
          "https://via.placeholder.com/800x600?text=Nike+Jordan+1+3",
        ],
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        autoExtend: false,
      },
      {
        name: "Rolex Submariner Date 126610LN",
        description:
          "Đồng hồ Rolex Submariner Date, máy tự động, dây đeo thép không gỉ. Đồng hồ chính hãng, còn bảo hành.",
        startingPrice: 800000000,
        bidStep: 10000000,
        buyNowPrice: 950000000,
        categoryId: watches.id,
        sellerId: seller1.id,
        mainImage: "https://via.placeholder.com/800x600?text=Rolex+Submariner",
        images: [
          "https://via.placeholder.com/800x600?text=Rolex+Submariner+1",
          "https://via.placeholder.com/800x600?text=Rolex+Submariner+2",
          "https://via.placeholder.com/800x600?text=Rolex+Submariner+3",
        ],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
    ];

    const createdProducts = [];
    for (const productData of products) {
      const product = await Product.create({
        ...productData,
        slug: createSlug(productData.name),
        currentPrice: productData.startingPrice,
        startDate: new Date(),
        status: "active",
        bidCount: 0,
        viewCount: 0,
        isNew: true,
      });
      createdProducts.push(product);
    }

    // Create bids for each product
    const bidders = [bidder1, bidder2, bidder3];
    for (const product of createdProducts) {
      const numBids = Math.floor(Math.random() * 5) + 5; // 5-10 bids per product
      let currentPrice = parseFloat(product.startingPrice.toString());

      for (let i = 0; i < numBids; i++) {
        const bidder = bidders[Math.floor(Math.random() * bidders.length)];
        currentPrice += parseFloat(product.bidStep.toString());

        await Bid.create({
          productId: product.id,
          bidderId: bidder.id,
          amount: currentPrice,
          isAutoBid: Math.random() > 0.7, // 30% chance of auto-bid
          isRejected: false,
        });

        // Update product current price
        product.currentPrice = currentPrice;
        product.bidCount += 1;
      }

      await product.save();
    }

    console.log("Seed data created successfully!");
    console.log("Admin: admin@auction.com / admin123");
    console.log("Seller: seller1@auction.com / seller123");
    console.log("Bidder: bidder1@auction.com / bidder123");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await sequelize.close();
  }
};

seed();
