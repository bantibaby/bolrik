require('dotenv').config();
const mongoose = require("mongoose");
const User = require("../models/user"); // ✅ Ensure User model is imported
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');

        // ✅ Ensure PreResult Collection Exists
        const collections = await mongoose.connection.db.listCollections().toArray();
        if (!collections.some(col => col.name === "preResults")) {
            console.log("⚠️ PreResult Collection Not Found! Creating Now...");
            await mongoose.connection.db.createCollection("preResults");
        }

    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
};
module.exports = connectDB;


