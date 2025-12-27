import { sequelize } from "../config/database";
import { Settings } from "../models";

const createSettingsTable = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected");

    // Sync only Settings model
    await Settings.sync({ alter: true });
    console.log("Settings table created/updated successfully");

    // Create default settings if they don't exist
    const [thresholdSetting] = await Settings.findOrCreate({
      where: { key: "AUTO_EXTEND_THRESHOLD_MINUTES" },
      defaults: {
        key: "AUTO_EXTEND_THRESHOLD_MINUTES",
        value: process.env.AUTO_EXTEND_THRESHOLD_MINUTES || "5",
        description: "Số phút trước khi kết thúc để kích hoạt tự động gia hạn",
      },
    });

    const [durationSetting] = await Settings.findOrCreate({
      where: { key: "AUTO_EXTEND_DURATION_MINUTES" },
      defaults: {
        key: "AUTO_EXTEND_DURATION_MINUTES",
        value: process.env.AUTO_EXTEND_DURATION_MINUTES || "10",
        description: "Số phút gia hạn thêm khi có lượt đấu giá mới",
      },
    });

    console.log("Default settings created/verified:");
    console.log(`- AUTO_EXTEND_THRESHOLD_MINUTES: ${thresholdSetting.value}`);
    console.log(`- AUTO_EXTEND_DURATION_MINUTES: ${durationSetting.value}`);

    process.exit(0);
  } catch (error) {
    console.error("Error creating settings table:", error);
    process.exit(1);
  }
};

createSettingsTable();

