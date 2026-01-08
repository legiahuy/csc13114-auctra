import { sequelize } from "../config/database";
import { User, Product, Order, Review, Question } from "../models/index";

const verify = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    // Check Product Count
    const productCount = await Product.count();
    console.log(`\nTotal Products: ${productCount}`);
    
    // Check Products Per Category
    const products = await Product.findAll();
    const catMap: {[key: number]: {active: number, ended: number}} = {};
    for(const p of products) {
        if(!catMap[p.categoryId]) catMap[p.categoryId] = {active: 0, ended: 0};
        if(p.status === 'active') catMap[p.categoryId].active++;
        else catMap[p.categoryId].ended++;
    }
    console.log("\n--- Products per Category ---");
    for(const catId in catMap) {
        console.log(`CategoryID ${catId}: Active=${catMap[catId].active}, Ended=${catMap[catId].ended}`);
        if(catMap[catId].active < 6) console.error(`  WARNING: Category ${catId} has < 6 active products!`);
    }

    // Check Orders
    const orderCount = await Order.count();
    console.log(`Total Orders: ${orderCount}`);

    // Check Questions
    const questionCount = await Question.count();
    console.log(`Total Questions: ${questionCount}`);

  } catch (error) {
    console.error("Verification failed:", error);
  } finally {
    await sequelize.close();
  }
};

verify();
