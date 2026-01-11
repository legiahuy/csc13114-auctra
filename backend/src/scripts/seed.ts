import { sequelize } from "../config/database";
import { User, Category, Product, Bid, Order, Review, Question } from "../models/index";
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
    const sellersData = [
      { email: "seller1@auction.com", name: "Alex Nguyen", address: "123 Seller Street" },
      { email: "seller2@auction.com", name: "Bella Tran", address: "456 Seller Avenue" },
      { email: "seller3@auction.com", name: "David Vo", address: "789 Seller Boulevard" },
      { email: "seller4@auction.com", name: "Emma Do", address: "321 Seller Way" },
      { email: "seller5@auction.com", name: "Frank Luu", address: "654 Seller Drive" },
    ];

    const sellers = [];
    for (const s of sellersData) {
      const seller = await User.create({
        email: s.email,
        password: "seller123",
        fullName: s.name,
        address: s.address,
        role: "seller",
        isEmailVerified: true,
        rating: 0,
        totalRatings: 0,
      });
      sellers.push(seller);
    }

    // Create bidder users
    const biddersData = [
      { email: "bidder1@auction.com", name: "Chris Le", address: "789 Bidder Road" },
      { email: "bidder2@auction.com", name: "Diana Pham", address: "321 Bidder Lane" },
      { email: "bidder3@auction.com", name: "Ethan Hoang", address: "654 Bidder Street" },
      { email: "bidder4@auction.com", name: "Fiona Bui", address: "987 Bidder Court" },
      { email: "bidder5@auction.com", name: "George Dang", address: "147 Bidder Plaza" },
      { email: "bidder6@auction.com", name: "Hannah Nguyen", address: "258 Bidder Cir" },
      { email: "bidder7@auction.com", name: "Ian Tran", address: "369 Bidder Dr" },
    ];

    const bidders = [];
    for (const b of biddersData) {
      const bidder = await User.create({
        email: b.email,
        password: "bidder123",
        fullName: b.name,
        address: b.address,
        role: "bidder",
        isEmailVerified: true,
        rating: 0,
        totalRatings: 0,
      });
      bidders.push(bidder);
    }

    // Create categories
    const electronics = await Category.create({ name: "Electronics", slug: "electronics" });
    const phones = await Category.create({ name: "Mobile Phones", slug: "mobile-phones", parentId: electronics.id });
    const laptops = await Category.create({ name: "Laptops", slug: "laptops", parentId: electronics.id });

    const fashion = await Category.create({ name: "Fashion", slug: "fashion" });
    const shoes = await Category.create({ name: "Shoes", slug: "shoes", parentId: fashion.id });
    const watches = await Category.create({ name: "Watches", slug: "watches", parentId: fashion.id });
    
    const home = await Category.create({ name: "Home & Living", slug: "home-living" });
    const furniture = await Category.create({ name: "Furniture", slug: "furniture", parentId: home.id });

    // Review comments pool
    const positiveReviews = [
      "Great product, fast shipping!",
      "Item exactly as described. Highly recommended.",
      "Excellent seller, very responsive.",
      "Good quality, worth the price.",
      "Fast delivery and good packaging.",
      "Trustworthy seller, will buy again.",
    ];

    const negativeReviews = [
      "Shipping was a bit slow.",
      "Product description wasn't 100% accurate, but okay.",
      "Packaging could be better.",
    ];

    // Questions pool
    const questions = [
      "Is this authentic?",
      "Do you have the original receipt?",
      "Can you ship to Hanoi instantly?",
      "Is the warranty still valid?",
      "Any scratches on the screen?",
      "Does it come with the original box?",
      "Can I pick it up personally?",
    ];

    const answers = [
      "Yes, 100% authentic.",
      "Yes, I can provide the receipt.",
      "Shipping takes 2-3 days typically.",
      "Yes, warranty is valid until next year.",
      "No scratches, it is like new.",
      "Yes, full box included.",
      "Sorry, shipping only.",
    ];

    // Create products
    const productTemplates = [
      // Phones
      { 
          name: "iPhone 15 Pro Max 256GB", 
          cat: phones.id, 
          price: 25000000, 
          img: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=600&fit=crop",
          additionalImgs: [
              "https://images.unsplash.com/photo-1695048133021-be2def43f3b2?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800&h=600&fit=crop"
          ]
      },
      { 
          name: "Samsung Galaxy S24 Ultra", 
          cat: phones.id, 
          price: 22000000, 
          img: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=600&fit=crop",
          additionalImgs: [
               "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=600&fit=crop",
               "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop",
               "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800&h=600&fit=crop"
          ] 
      },
      { 
          name: "Xiaomi 14 Pro", 
          cat: phones.id, 
          price: 18000000, 
          img: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=600&fit=crop",
          additionalImgs: [
              "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1584006682522-dc17d6c0d9ac?w=800&h=600&fit=crop"
          ] 
      },
      
      // Laptops
      { 
          name: "MacBook Pro 14 M3", 
          cat: laptops.id, 
          price: 45000000, 
          img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop",
          additionalImgs: [
              "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop"
          ]
      },
      { 
          name: "Dell XPS 15", 
          cat: laptops.id, 
          price: 40000000, 
          img: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&h=600&fit=crop",
          additionalImgs: [
              "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&h=600&fit=crop"
          ]
      },
      
      // Shoes
      { 
          name: "Nike Air Jordan 1", 
          cat: shoes.id, 
          price: 5000000, 
          img: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=600&fit=crop",
           additionalImgs: [
              "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop"
          ] 
      },
      { 
          name: "Yeezy Boost 350", 
          cat: shoes.id, 
          price: 8000000, 
          img: "https://images.unsplash.com/photo-1588499894193-2c4dd05b0f09?w=800&h=600&fit=crop",
          additionalImgs: [
              "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800&h=600&fit=crop"
          ]
      },

      // Watches
      { 
          name: "Rolex Submariner", 
          cat: watches.id, 
          price: 800000000, 
          img: "https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=800&h=600&fit=crop",
           additionalImgs: [
              "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1622434641406-a158123450f9?w=800&h=600&fit=crop"
          ]
      },
      { 
          name: "Omega Seamaster", 
          cat: watches.id, 
          price: 120000000, 
          img: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800&h=600&fit=crop",
          additionalImgs: [
              "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&h=600&fit=crop"
          ]
      },
      
      // Furniture (New)
      { 
          name: "Herman Miller Aeron", 
          cat: furniture.id, 
          price: 25000000, 
          img: "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=800&h=600&fit=crop",
          additionalImgs: [
              "https://images.unsplash.com/photo-1544207240-8b1025eb7aeb?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&h=600&fit=crop",
              "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop"
          ]
      },
      
      // More random fills
      { name: "Google Pixel 8 Pro", cat: phones.id, price: 20000000, img: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&h=600&fit=crop"] },
      { name: "Oppo Find X7 Ultra", cat: phones.id, price: 19000000, img: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=600&fit=crop"] },
      { name: "OnePlus 12", cat: phones.id, price: 15000000, img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&h=600&fit=crop"] },
      { name: "iPhone 14 Pro", cat: phones.id, price: 18000000, img: "https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1695578130391-929bdfff85d8?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1678652197831-2d180705cd2c?w=800&h=600&fit=crop"] },
      { name: "ASUS ROG Zephyrus", cat: laptops.id, price: 35000000, img: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&h=600&fit=crop"] },
      { name: "ThinkPad X1 Carbon", cat: laptops.id, price: 32000000, img: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=600&fit=crop"] },
      { name: "HP Spectre x360", cat: laptops.id, price: 28000000, img: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&h=600&fit=crop"] },
      { name: "Surface Laptop Studio", cat: laptops.id, price: 55000000, img: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&h=600&fit=crop"] },
      { name: "Nike Dunk Low", cat: shoes.id, price: 4000000, img: "https://images.unsplash.com/photo-1605408499391-6368c628ef42?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=600&fit=crop"] },
      { name: "New Balance 550", cat: shoes.id, price: 3500000, img: "https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&h=600&fit=crop"] },
      { name: "Vans Old Skool", cat: shoes.id, price: 1500000, img: "https://images.unsplash.com/photo-1543508282-6319a3e2621f?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1588099768531-a72d4a198538?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800&h=600&fit=crop"] },
      { name: "Converse Chuck 70", cat: shoes.id, price: 2000000, img: "https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1628253747716-0c4f5c90fdda?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1543508282-6319a3e2621f?w=800&h=600&fit=crop"] },
      { name: "TAG Heuer Carrera", cat: watches.id, price: 60000000, img: "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1609587312208-cea54be969e7?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=800&h=600&fit=crop"] },
      { name: "Apple Watch S9", cat: watches.id, price: 12000000, img: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1510017803434-a899398421b3?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1579586337278-3befd40fdc17a?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1617043786394-f977fa12eddf?w=800&h=600&fit=crop"] },
      { name: "Galaxy Watch 6", cat: watches.id, price: 8000000, img: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1617043786394-f977fa12eddf?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&h=600&fit=crop"] },
      { name: "Casio G-Shock", cat: watches.id, price: 3000000, img: "https://images.unsplash.com/photo-1603850179998-3a57f293b2c5?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1526045431048-f857369baa09?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=800&h=600&fit=crop"] },
      { name: "Standing Desk Electric", cat: furniture.id, price: 8000000, img: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=800&h=600&fit=crop"] },
      { name: "Leather Sofa 3-Seater", cat: furniture.id, price: 15000000, img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1550226891-ef816aed4a98?w=800&h=600&fit=crop"] },
      { name: "Wooden Dining Table", cat: furniture.id, price: 12000000, img: "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop"] },
      { name: "Ergonomic Office Chair", cat: furniture.id, price: 6000000, img: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=800&h=600&fit=crop"] },
      
      // Additional products to reach 25 active (35 total)
      { name: "Realme GT 5", cat: phones.id, price: 12000000, img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800&h=600&fit=crop"] },
      { name: "Vivo X100 Pro", cat: phones.id, price: 17000000, img: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&h=600&fit=crop"] },
      { name: "Lenovo Legion 5 Pro", cat: laptops.id, price: 30000000, img: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&h=600&fit=crop"] },
      { name: "Acer Predator Helios", cat: laptops.id, price: 38000000, img: "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&h=600&fit=crop"] },
      { name: "Adidas Ultraboost", cat: shoes.id, price: 4500000, img: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&h=600&fit=crop"] },
      { name: "Puma RS-X", cat: shoes.id, price: 2500000, img: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&h=600&fit=crop", additionalImgs: ["https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&h=600&fit=crop", "https://images.unsplash.com/photo-1605408499391-6368c628ef42?w=800&h=600&fit=crop"] },
    ];

    const createdProducts = [];
    
    // Deterministic approach: First 10 products = ended, rest = active
    const NUM_ENDED_PRODUCTS = 10;

    for (let i = 0; i < productTemplates.length; i++) {
        const t = productTemplates[i];
        const isEnded = i < NUM_ENDED_PRODUCTS; // First 10 are ended
        const seller = sellers[i % sellers.length]; // Distribute evenly across sellers
        
        const startingPrice = t.price;
        const bidStep = Math.round(startingPrice * 0.05 / 10000) * 10000; // ~5% step
        
        const endDate = isEnded 
            ? new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)) // Ended 0-7 days ago
            : new Date(Date.now() + Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000) + 24*60*60*1000); // Ends in 1-11 days

        const product = await Product.create({
            name: t.name,
            slug: createSlug(t.name) + "-" + Math.random().toString(36).substring(7),
            description: `This is a high quality ${t.name}. Authentic and great condition.`,
            nameNoDiacritics: removeVietnameseDiacritics(t.name),
            descriptionNoDiacritics: removeVietnameseDiacritics(`This is a high quality ${t.name}. Authentic and great condition.`),
            startingPrice: startingPrice,
            currentPrice: startingPrice, // Will update after bids
            bidStep: bidStep,
            buyNowPrice: Math.floor(startingPrice * 1.5),
            categoryId: t.cat,
            sellerId: seller.id,
            mainImage: t.img,
            images: t.additionalImgs || [t.img, t.img, t.img],
            status: isEnded ? 'ended' : 'active',
            startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // Started 10 days ago
            endDate: endDate,
            bidCount: 0,
            viewCount: Math.floor(Math.random() * 1000),
            isNew: !isEnded && Math.random() > 0.7,
            allowUnratedBidders: true,
            autoExtend: true,
        });

        createdProducts.push(product);

        // Generate Bids with MaxBid System
        const numBids = Math.floor(Math.random() * 6) + 5; // 5-10 bids (guaranteed minimum 5)
        const numUniqueBidders = Math.min(Math.floor(Math.random() * 3) + 3, bidders.length); // 3-5 unique bidders
        const selectedBidders = [];
        
        // Select unique bidders for this product
        const availableBidders = [...bidders];
        for (let b = 0; b < numUniqueBidders; b++) {
            const randomIndex = Math.floor(Math.random() * availableBidders.length);
            selectedBidders.push(availableBidders[randomIndex]);
            availableBidders.splice(randomIndex, 1);
        }

        let currentPrice = parseFloat(startingPrice.toString());
        let lastBidderId = null;
        let lastBidTime = new Date(Date.now() - numBids * 3600000);

        for (let j = 0; j < numBids; j++) {
            const bidder = selectedBidders[j % selectedBidders.length];
            currentPrice += parseFloat(bidStep.toString());
            
            // MaxAmount is 1-4 bid steps higher than current bid
            const extraSteps = Math.floor(Math.random() * 4) + 1;
            const maxAmount = currentPrice + (parseFloat(bidStep.toString()) * extraSteps);
            
            // Determine if this is an auto-bid (60% chance)
            const isAutoBid = Math.random() > 0.4;
            
            // Spread bids over time (more recent bids are closer together)
            lastBidTime = new Date(lastBidTime.getTime() + Math.floor(Math.random() * 7200000) + 1800000); // 0.5-2.5 hours apart
            
            await Bid.create({
                productId: product.id,
                bidderId: bidder.id,
                amount: currentPrice,
                maxAmount: maxAmount,
                isAutoBid: isAutoBid,
                isRejected: false,
                createdAt: lastBidTime,
            });
            lastBidderId = bidder.id;
        }

        // Update product with final price and bid count
        await product.update({
            currentPrice: currentPrice,
            bidCount: numBids
        });

        // Questions Logic
        if (Math.random() > 0.3) { // 70% products have questions
           const numQuestions = Math.floor(Math.random() * 3) + 1;
           for(let q=0; q<numQuestions; q++) {
             const asker = bidders[Math.floor(Math.random() * bidders.length)];
             const questionText = questions[Math.floor(Math.random() * questions.length)];
             
             const question = await Question.create({
               productId: product.id,
               userId: asker.id,
               question: questionText,
               createdAt: new Date(Date.now() - Math.floor(Math.random() * 5 * 24 * 3600 * 1000)),
             });

             // Answer logic
             if (Math.random() > 0.3) { // 70% questions answered
               await question.update({
                 answer: answers[Math.floor(Math.random() * answers.length)],
                 answeredAt: new Date(question.createdAt.getTime() + 3600000), // Answered 1 hour later
               });
             }
           }
        }

        // Generate Order & Bidirectional Reviews IF Ended
        if (isEnded && lastBidderId) {
            // Create Order
            const order = await Order.create({
                productId: product.id,
                sellerId: seller.id,
                buyerId: lastBidderId,
                finalPrice: currentPrice,
                status: 'completed',
                shippingAddress: "123 Winner St, Happy City",
                paymentMethod: "stripe",
                createdAt: new Date(endDate.getTime() + 3600000), // Created 1 hour after end
            });

            // Create Bidirectional Reviews
            
            // 1. Buyer reviews Seller
            const buyerRating = Math.random() > 0.2 ? 1 : -1; // 80% positive
            const buyerCommentPool = buyerRating === 1 ? positiveReviews : negativeReviews;
            
            await Review.create({
                reviewerId: lastBidderId,
                revieweeId: seller.id,
                orderId: order.id,
                rating: buyerRating,
                comment: buyerCommentPool[Math.floor(Math.random() * buyerCommentPool.length)],
                createdAt: new Date(order.createdAt.getTime() + 86400000), // 1 day after order
            });
            
            // 2. Seller reviews Buyer
            const sellerRating = Math.random() > 0.15 ? 1 : -1; // 85% positive
            const sellerCommentPool = sellerRating === 1 ? positiveReviews : negativeReviews;
            
            await Review.create({
                reviewerId: seller.id,
                revieweeId: lastBidderId,
                orderId: order.id,
                rating: sellerRating,
                comment: sellerCommentPool[Math.floor(Math.random() * sellerCommentPool.length)],
                createdAt: new Date(order.createdAt.getTime() + 86400000 + 3600000), // 1 day + 1 hour after order
            });
        }
    }

    // Recalculate User Ratings from Actual Reviews
    console.log("Recalculating user ratings from reviews...");
    
    const allUsers = [...sellers, ...bidders];
    for (const user of allUsers) {
        const userReviews = await Review.findAll({
            where: { revieweeId: user.id }
        });
        
        const totalRatings = userReviews.length;
        const positiveRatings = userReviews.filter(r => r.rating === 1).length;
        
        await user.update({
            rating: positiveRatings,
            totalRatings: totalRatings
        });
    }


    console.log("Seed data created successfully!");
    console.log(`Total products: ${createdProducts.length}`);
    console.log(`Ended products (with Orders/Reviews): ${NUM_ENDED_PRODUCTS}`);
    console.log(`Active products: ${createdProducts.length - NUM_ENDED_PRODUCTS}`);
    console.log(`Total orders: ${NUM_ENDED_PRODUCTS}`);
    console.log(`Total reviews: ${NUM_ENDED_PRODUCTS * 2} (bidirectional)`);

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await sequelize.close();
  }
};

seed();
