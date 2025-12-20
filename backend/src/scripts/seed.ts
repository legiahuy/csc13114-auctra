import { sequelize } from "../config/database";
import { User, Category, Product, Bid } from "../models/index";
import {
  createSlug,
  removeVietnameseDiacritics,
} from "../utils/vietnamese.util";

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
      fullName: "Alex Nguyen",
      address: "123 Seller Street",
      role: "seller",
      isEmailVerified: true,
      rating: 8,
      totalRatings: 10,
    });

    const seller2 = await User.create({
      email: "seller2@auction.com",
      password: "seller123",
      fullName: "Bella Tran",
      address: "456 Seller Avenue",
      role: "seller",
      isEmailVerified: true,
      rating: 9,
      totalRatings: 10,
    });

    const seller3 = await User.create({
      email: "seller3@auction.com",
      password: "seller123",
      fullName: "David Vo",
      address: "789 Seller Boulevard",
      role: "seller",
      isEmailVerified: true,
      rating: 6, // 6 out of 8 = 75%
      totalRatings: 8,
    });

    const seller4 = await User.create({
      email: "seller4@auction.com",
      password: "seller123",
      fullName: "Emma Do",
      address: "321 Seller Way",
      role: "seller",
      isEmailVerified: true,
      rating: 11, // 11 out of 12 = ~92%
      totalRatings: 12,
    });

    const seller5 = await User.create({
      email: "seller5@auction.com",
      password: "seller123",
      fullName: "Frank Luu",
      address: "654 Seller Drive",
      role: "seller",
      isEmailVerified: true,
      rating: 13, // 13 out of 15 = ~87%
      totalRatings: 15,
    });
    
      const seller6 = await User.create({
      email: "khoavosng123@gmail.com",
      password: "seller123",
      fullName: "Khoavo",
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
      fullName: "Chris Le",
      address: "789 Bidder Road",
      role: "bidder",
      isEmailVerified: true,
      rating: 8,
      totalRatings: 10,
    });

    const bidder2 = await User.create({
      email: "bidder2@auction.com",
      password: "bidder123",
      fullName: "Diana Pham",
      address: "321 Bidder Lane",
      role: "bidder",
      isEmailVerified: true,
      rating: 9,
      totalRatings: 10,
    });

    const bidder3 = await User.create({
      email: "bidder3@auction.com",
      password: "bidder123",
      fullName: "Ethan Hoang",
      address: "654 Bidder Street",
      role: "bidder",
      isEmailVerified: true,
      rating: 7,
      totalRatings: 10,
    });

    const bidder4 = await User.create({
      email: "bidder4@auction.com",
      password: "bidder123",
      fullName: "Fiona Bui",
      address: "987 Bidder Court",
      role: "bidder",
      isEmailVerified: true,
      rating: 10, // 10 out of 12 = ~83%
      totalRatings: 12,
    });

    const bidder5 = await User.create({
      email: "bidder5@auction.com",
      password: "bidder123",
      fullName: "George Dang",
      address: "147 Bidder Plaza",
      role: "bidder",
      isEmailVerified: true,
      rating: 10, // 10 out of 11 = ~91%
      totalRatings: 11,
    });

    // Create categories
    const electronics = await Category.create({
      name: "Electronics",
      slug: "electronics",
    });

    const phones = await Category.create({
      name: "Mobile Phones",
      slug: "mobile-phones",
      parentId: electronics.id,
    });

    const laptops = await Category.create({
      name: "Laptops",
      slug: "laptops",
      parentId: electronics.id,
    });

    const fashion = await Category.create({
      name: "Fashion",
      slug: "fashion",
    });

    const shoes = await Category.create({
      name: "Shoes",
      slug: "shoes",
      parentId: fashion.id,
    });

    const watches = await Category.create({
      name: "Watches",
      slug: "watches",
      parentId: fashion.id,
    });

    // Create products
    const sellers = [seller1, seller2, seller3, seller4, seller5];
    const products = [
      {
        name: "iPhone 15 Pro Max 256GB",
        description:
          "Brand new iPhone 15 Pro Max, unused with active Apple warranty. Pristine condition, full box with all accessories.",
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
          "Samsung Galaxy S24 Ultra in black, 99% new with official warranty. Full box with all accessories.",
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
          "MacBook Pro 14-inch with M3 Pro, 18GB RAM, 512GB SSD. Brand new, unused, with active Apple warranty.",
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
          "Nike Air Jordan 1 shoes size 42 in red/black/white. Authentic, 100% new with box.",
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
          "Rolex Submariner Date automatic watch with stainless steel bracelet. Authentic with remaining warranty.",
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
      // Additional products
      {
        name: "Xiaomi 14 Pro 512GB",
        description:
          "Xiaomi 14 Pro flagship smartphone with Leica camera, 512GB storage. Brand new, sealed box with warranty.",
        startingPrice: 18000000,
        bidStep: 400000,
        buyNowPrice: 23000000,
        categoryId: phones.id,
        sellerId: seller3.id,
        mainImage: "https://via.placeholder.com/800x600?text=Xiaomi+14+Pro",
        images: [
          "https://via.placeholder.com/800x600?text=Xiaomi+14+Pro+1",
          "https://via.placeholder.com/800x600?text=Xiaomi+14+Pro+2",
        ],
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "OnePlus 12 256GB",
        description:
          "OnePlus 12 with Snapdragon 8 Gen 3, 256GB storage. 95% new, excellent condition with original charger.",
        startingPrice: 15000000,
        bidStep: 300000,
        buyNowPrice: 20000000,
        categoryId: phones.id,
        sellerId: seller4.id,
        mainImage: "https://via.placeholder.com/800x600?text=OnePlus+12",
        images: [
          "https://via.placeholder.com/800x600?text=OnePlus+12+1",
          "https://via.placeholder.com/800x600?text=OnePlus+12+2",
        ],
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        autoExtend: false,
      },
      {
        name: "Dell XPS 15 OLED 2024",
        description:
          "Dell XPS 15 with OLED display, Intel i7, 32GB RAM, 1TB SSD. Like new condition, used for 2 months only.",
        startingPrice: 40000000,
        bidStep: 800000,
        buyNowPrice: 48000000,
        categoryId: laptops.id,
        sellerId: seller2.id,
        mainImage: "https://via.placeholder.com/800x600?text=Dell+XPS+15",
        images: [
          "https://via.placeholder.com/800x600?text=Dell+XPS+15+1",
          "https://via.placeholder.com/800x600?text=Dell+XPS+15+2",
        ],
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "ASUS ROG Zephyrus G16",
        description:
          "ASUS ROG gaming laptop with RTX 4070, Intel i9, 16GB RAM, 512GB SSD. Brand new, unopened box.",
        startingPrice: 35000000,
        bidStep: 700000,
        buyNowPrice: 42000000,
        categoryId: laptops.id,
        sellerId: seller5.id,
        mainImage: "https://via.placeholder.com/800x600?text=ASUS+ROG+G16",
        images: [
          "https://via.placeholder.com/800x600?text=ASUS+ROG+G16+1",
          "https://via.placeholder.com/800x600?text=ASUS+ROG+G16+2",
        ],
        endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "Lenovo ThinkPad X1 Carbon Gen 11",
        description:
          "Lenovo ThinkPad X1 Carbon ultrabook, Intel i7, 16GB RAM, 512GB SSD. Business laptop in excellent condition.",
        startingPrice: 32000000,
        bidStep: 600000,
        buyNowPrice: 38000000,
        categoryId: laptops.id,
        sellerId: seller3.id,
        mainImage: "https://via.placeholder.com/800x600?text=ThinkPad+X1",
        images: [
          "https://via.placeholder.com/800x600?text=ThinkPad+X1+1",
          "https://via.placeholder.com/800x600?text=ThinkPad+X1+2",
        ],
        endDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
        autoExtend: false,
      },
      {
        name: "Adidas Yeezy Boost 350 V2",
        description:
          "Adidas Yeezy Boost 350 V2 size 43 in Zebra colorway. Authentic, 100% new with original box and tags.",
        startingPrice: 8000000,
        bidStep: 300000,
        buyNowPrice: 12000000,
        categoryId: shoes.id,
        sellerId: seller3.id,
        mainImage: "https://via.placeholder.com/800x600?text=Yeezy+350",
        images: [
          "https://via.placeholder.com/800x600?text=Yeezy+350+1",
          "https://via.placeholder.com/800x600?text=Yeezy+350+2",
        ],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "Nike Dunk Low Panda",
        description:
          "Nike Dunk Low Panda size 41, black and white. Brand new, never worn, with original box.",
        startingPrice: 4000000,
        bidStep: 150000,
        buyNowPrice: 6000000,
        categoryId: shoes.id,
        sellerId: seller4.id,
        mainImage: "https://via.placeholder.com/800x600?text=Nike+Dunk+Panda",
        images: [
          "https://via.placeholder.com/800x600?text=Nike+Dunk+Panda+1",
          "https://via.placeholder.com/800x600?text=Nike+Dunk+Panda+2",
        ],
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        autoExtend: false,
      },
      {
        name: "Converse Chuck 70 High Top",
        description:
          "Converse Chuck 70 High Top size 42 in classic black. Authentic, 95% new, excellent condition.",
        startingPrice: 2000000,
        bidStep: 100000,
        buyNowPrice: 3000000,
        categoryId: shoes.id,
        sellerId: seller5.id,
        mainImage: "https://via.placeholder.com/800x600?text=Converse+Chuck",
        images: [
          "https://via.placeholder.com/800x600?text=Converse+Chuck+1",
          "https://via.placeholder.com/800x600?text=Converse+Chuck+2",
        ],
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "Omega Seamaster Professional 300M",
        description:
          "Omega Seamaster Professional 300M automatic dive watch, stainless steel. Authentic with box and papers.",
        startingPrice: 120000000,
        bidStep: 5000000,
        buyNowPrice: 150000000,
        categoryId: watches.id,
        sellerId: seller2.id,
        mainImage: "https://via.placeholder.com/800x600?text=Omega+Seamaster",
        images: [
          "https://via.placeholder.com/800x600?text=Omega+Seamaster+1",
          "https://via.placeholder.com/800x600?text=Omega+Seamaster+2",
        ],
        endDate: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "TAG Heuer Carrera Chronograph",
        description:
          "TAG Heuer Carrera automatic chronograph watch, black dial. Pre-owned but excellent condition, with box.",
        startingPrice: 60000000,
        bidStep: 2000000,
        buyNowPrice: 75000000,
        categoryId: watches.id,
        sellerId: seller4.id,
        mainImage: "https://via.placeholder.com/800x600?text=TAG+Heuer",
        images: [
          "https://via.placeholder.com/800x600?text=TAG+Heuer+1",
          "https://via.placeholder.com/800x600?text=TAG+Heuer+2",
        ],
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        autoExtend: false,
      },
      {
        name: "Apple Watch Series 9 45mm",
        description:
          "Apple Watch Series 9 GPS + Cellular, 45mm, aluminum case. Brand new, sealed box with warranty.",
        startingPrice: 12000000,
        bidStep: 400000,
        buyNowPrice: 15000000,
        categoryId: watches.id,
        sellerId: seller1.id,
        mainImage: "https://via.placeholder.com/800x600?text=Apple+Watch+9",
        images: [
          "https://via.placeholder.com/800x600?text=Apple+Watch+9+1",
          "https://via.placeholder.com/800x600?text=Apple+Watch+9+2",
        ],
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "Samsung Galaxy Watch 6 Classic",
        description:
          "Samsung Galaxy Watch 6 Classic 47mm, LTE version. Like new, used for 1 month, with all accessories.",
        startingPrice: 8000000,
        bidStep: 300000,
        buyNowPrice: 11000000,
        categoryId: watches.id,
        sellerId: seller3.id,
        mainImage: "https://via.placeholder.com/800x600?text=Galaxy+Watch+6",
        images: [
          "https://via.placeholder.com/800x600?text=Galaxy+Watch+6+1",
          "https://via.placeholder.com/800x600?text=Galaxy+Watch+6+2",
        ],
        endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
        autoExtend: false,
      },
      {
        name: "iPhone 14 Pro 128GB",
        description:
          "iPhone 14 Pro 128GB in Deep Purple. 90% new, excellent condition, with original charger and box.",
        startingPrice: 18000000,
        bidStep: 400000,
        buyNowPrice: 23000000,
        categoryId: phones.id,
        sellerId: seller5.id,
        mainImage: "https://via.placeholder.com/800x600?text=iPhone+14+Pro",
        images: [
          "https://via.placeholder.com/800x600?text=iPhone+14+Pro+1",
          "https://via.placeholder.com/800x600?text=iPhone+14+Pro+2",
        ],
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "Google Pixel 8 Pro 256GB",
        description:
          "Google Pixel 8 Pro with Tensor G3, 256GB storage. Brand new, unopened, with Google warranty.",
        startingPrice: 20000000,
        bidStep: 450000,
        buyNowPrice: 25000000,
        categoryId: phones.id,
        sellerId: seller1.id,
        mainImage: "https://via.placeholder.com/800x600?text=Pixel+8+Pro",
        images: [
          "https://via.placeholder.com/800x600?text=Pixel+8+Pro+1",
          "https://via.placeholder.com/800x600?text=Pixel+8+Pro+2",
        ],
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "HP Spectre x360 14",
        description:
          "HP Spectre x360 2-in-1 laptop, Intel i7, 16GB RAM, 1TB SSD, OLED touchscreen. Excellent condition.",
        startingPrice: 28000000,
        bidStep: 500000,
        buyNowPrice: 35000000,
        categoryId: laptops.id,
        sellerId: seller4.id,
        mainImage: "https://via.placeholder.com/800x600?text=HP+Spectre",
        images: [
          "https://via.placeholder.com/800x600?text=HP+Spectre+1",
          "https://via.placeholder.com/800x600?text=HP+Spectre+2",
        ],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        autoExtend: false,
      },
      {
        name: "Microsoft Surface Laptop Studio 2",
        description:
          "Microsoft Surface Laptop Studio 2, Intel i7, 32GB RAM, 1TB SSD. Brand new, sealed box.",
        startingPrice: 55000000,
        bidStep: 1000000,
        buyNowPrice: 65000000,
        categoryId: laptops.id,
        sellerId: seller1.id,
        mainImage: "https://via.placeholder.com/800x600?text=Surface+Studio",
        images: [
          "https://via.placeholder.com/800x600?text=Surface+Studio+1",
          "https://via.placeholder.com/800x600?text=Surface+Studio+2",
        ],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "New Balance 550 White Grey",
        description:
          "New Balance 550 retro sneakers size 42, white and grey colorway. Brand new with box.",
        startingPrice: 3500000,
        bidStep: 150000,
        buyNowPrice: 5000000,
        categoryId: shoes.id,
        sellerId: seller1.id,
        mainImage: "https://via.placeholder.com/800x600?text=NB+550",
        images: [
          "https://via.placeholder.com/800x600?text=NB+550+1",
          "https://via.placeholder.com/800x600?text=NB+550+2",
        ],
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        autoExtend: false,
      },
      {
        name: "Vans Old Skool Black White",
        description:
          "Vans Old Skool classic skate shoes size 41, black and white. Authentic, 98% new, excellent condition.",
        startingPrice: 1500000,
        bidStep: 80000,
        buyNowPrice: 2500000,
        categoryId: shoes.id,
        sellerId: seller2.id,
        mainImage: "https://via.placeholder.com/800x600?text=Vans+Old+Skool",
        images: [
          "https://via.placeholder.com/800x600?text=Vans+Old+Skool+1",
          "https://via.placeholder.com/800x600?text=Vans+Old+Skool+2",
        ],
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "Casio G-Shock GA-2100",
        description:
          "Casio G-Shock GA-2100 'CasiOak' digital-analog watch, black. Brand new, unopened box.",
        startingPrice: 3000000,
        bidStep: 100000,
        buyNowPrice: 4500000,
        categoryId: watches.id,
        sellerId: seller5.id,
        mainImage: "https://via.placeholder.com/800x600?text=G-Shock",
        images: [
          "https://via.placeholder.com/800x600?text=G-Shock+1",
          "https://via.placeholder.com/800x600?text=G-Shock+2",
        ],
        endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        autoExtend: false,
      },
      {
        name: "Oppo Find X7 Ultra 512GB",
        description:
          "Oppo Find X7 Ultra flagship with dual periscope cameras, 512GB storage. Brand new, sealed box.",
        startingPrice: 19000000,
        bidStep: 400000,
        buyNowPrice: 24000000,
        categoryId: phones.id,
        sellerId: seller2.id,
        mainImage: "https://via.placeholder.com/800x600?text=Oppo+X7",
        images: [
          "https://via.placeholder.com/800x600?text=Oppo+X7+1",
          "https://via.placeholder.com/800x600?text=Oppo+X7+2",
        ],
        endDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
        autoExtend: true,
      },
      {
        name: "Acer Predator Helios 16",
        description:
          "Acer Predator gaming laptop, RTX 4060, Intel i7, 16GB RAM, 512GB SSD. Like new, used for gaming only.",
        startingPrice: 30000000,
        bidStep: 600000,
        buyNowPrice: 37000000,
        categoryId: laptops.id,
        sellerId: seller3.id,
        mainImage: "https://via.placeholder.com/800x600?text=Acer+Predator",
        images: [
          "https://via.placeholder.com/800x600?text=Acer+Predator+1",
          "https://via.placeholder.com/800x600?text=Acer+Predator+2",
        ],
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        autoExtend: false,
      },
    ];

    const createdProducts = [];
    for (const productData of products) {
      const product = await Product.create({
        ...productData,
        slug: createSlug(productData.name),
        nameNoDiacritics: removeVietnameseDiacritics(productData.name),
        descriptionNoDiacritics: removeVietnameseDiacritics(
          productData.description
        ),
        currentPrice: productData.startingPrice,
        startDate: new Date(),
        status: "active",
        bidCount: 0,
        viewCount: 0,
        isNew: true,
        allowUnratedBidders: true,
      });
      createdProducts.push(product);
    }

    // Create bids for each product
    const bidders = [bidder1, bidder2, bidder3, bidder4, bidder5];
    for (const product of createdProducts) {
      const numBids = Math.floor(Math.random() * 8) + 5; // 5-13 bids per product
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
    console.log("\n=== Accounts ===");
    console.log("Admin: admin@auction.com / admin123");
    console.log("\nSellers:");
    console.log("  seller1@auction.com / seller123");
    console.log("  seller2@auction.com / seller123");
    console.log("  seller3@auction.com / seller123");
    console.log("  seller4@auction.com / seller123");
    console.log("  seller5@auction.com / seller123");
    console.log("\nBidders:");
    console.log("  bidder1@auction.com / bidder123");
    console.log("  bidder2@auction.com / bidder123");
    console.log("  bidder3@auction.com / bidder123");
    console.log("  bidder4@auction.com / bidder123");
    console.log("  bidder5@auction.com / bidder123");
    console.log(`\n=== Summary ===`);
    console.log(`Total products: ${createdProducts.length}`);
    console.log(`Total sellers: 5`);
    console.log(`Total bidders: 5`);
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await sequelize.close();
  }
};

seed();
