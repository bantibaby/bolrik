require('dotenv').config();
const mongoose = require("mongoose");
const User = require("../models/user"); // ✅ Ensure User model is imported
const connectDB = async () => {
    try {
        // Add connection options to prevent timeouts
        const options = {
            serverSelectionTimeoutMS: 30000, // Timeout for server selection (30 seconds)
            socketTimeoutMS: 45000, // Socket timeout (45 seconds)
            connectTimeoutMS: 30000, // Connection timeout (30 seconds)
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 2, // Minimum number of connections in the pool
            maxIdleTimeMS: 30000, // Maximum time a connection can remain idle (30 seconds)
            family: 4 // Use IPv4, skip trying IPv6
        };
        
        await mongoose.connect(process.env.MONGO_URI, options);
        console.log('MongoDB connected with improved timeout settings');

        // Check if connection is ready before accessing db
        if (mongoose.connection.readyState === 1) {
            try {
                // ✅ Ensure PreResult Collection Exists - with error handling
                const collections = await Promise.race([
                    mongoose.connection.db.listCollections().toArray(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("listCollections timeout")), 5000)
                    )
                ]);
                
                if (!collections.some(col => col.name === "preResults")) {
                    console.log("⚠️ PreResult Collection Not Found! Creating Now...");
                    await mongoose.connection.db.createCollection("preResults");
                }
            } catch (collectionError) {
                console.warn("Could not verify collections, will continue anyway:", collectionError.message);
                // Continue without failing - this is non-critical
            }
        } else {
            console.warn("MongoDB connection not in ready state, skipping collection check");
        }
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        // Don't exit process, allow retry
        throw error;
    }
};
module.exports = connectDB;


