require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
const MongoStore = require("connect-mongo");
const mongoose = require('mongoose');
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// ✅ Import Routes & Models
const twilroutes = require('./routes/twilioroute');
const adminRoutes = require("./routes/admin"); // ✅ Admin Panel Routes
const Result = require('./models/result');
const PreResult = require("./models/preResult");
const Game = require('./models/game');
const { checkUser } = require('./middleware/auth');

const connectDB = require('./config/db');
const { initializeSocket } = require("./socket/socket");

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

const PORT = process.env.PORT || 4000;

// ✅ Paths Configuration
const viewsPath = path.join(__dirname, '/templates/views');
const partialsPath = path.join(__dirname, '/templates/partials');
const staticFiles = path.join(__dirname, '/public');
const uploadsDir = path.join(__dirname, 'uploads');

// ✅ Ensure 'uploads' Folder Exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir)); // ✅ Serve Uploaded Files
app.use(express.static(staticFiles));
app.set('view engine', 'hbs');
app.set('views', viewsPath);
hbs.registerPartials(partialsPath);

// ✅ Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: "*" }));

// ✅ MongoDB Connection Before Using Sessions
const mongoURI = process.env.MONGO_URI;

async function startServer() {
    try {
        await connectDB(mongoURI);
        console.log("✅ MongoDB Connected Successfully");

        // ✅ Secure Session Middleware with MongoDB Store
        app.use(session({
            secret: process.env.SESSION_SECRET || "mysecret",
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({ mongoUrl: mongoURI, collectionName: "sessions" }),
            cookie: { 
            maxAge: 1000 * 60 * 60 * 24, 
            secure: process.env.NODE_ENV === "production", 
            // secure: false,
            httpOnly: true,
            sameSite: "strict"
             } // ✅ Secure Cookies
        }));

        // ✅ Handlebars Helpers
        hbs.registerHelper("incrementedIndex", (index) => index + 1);
        hbs.registerHelper("winOrLoss", (winAmount, lossAmount) => {
            if (winAmount > 0) return `+${winAmount} ₹`;
            if (lossAmount > 0) return `-${lossAmount} ₹`;
            return "-";
        });
        hbs.registerHelper("rowClass", (winAmount, lossAmount) => {
            if (winAmount > 0) return "win-row"; // Green
            if (lossAmount > 0) return "loss-row"; // Red
            return ""; // Default (No styling)
        });

        // ✅ Register "eq" Helper for Handlebars
        hbs.registerHelper("eq", function (a, b) {
            return a === b;
        });

        // ✅ Home Route (Result Page)
        app.get('/', checkUser, async (req, res) => {
            try {
                const results = await Result.find().sort({ resultNumber: -1 });
                res.render('index.hbs', { results });
            } catch (error) {
                console.error("❌ Error loading results:", error);
                res.status(500).send("Error loading results");
            }
        });

        // ✅ User & Admin Routes
        app.use('/user', twilroutes);
        app.use('/admin', adminRoutes); // ✅ Admin Panel Route

        // ✅ 404 Error Handling
        app.use((req, res) => {
            res.status(404).render("404.hbs", { message: "Page Not Found" });
        });
        app.use((req, res, next) => {
            res.locals.baseURL = process.env.BASE_URL || "https://your-railway-app-name.up.railway.app";
            next();
        });
        
        // ✅ Global Error Handling
        app.use((err, req, res, next) => {
            console.error("❌ Server Error:", err);
            res.status(500).render("500.hbs", { message: "Internal Server Error" });
        });

        // ✅ Start Server
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("❌ MongoDB Connection Failed:", error);
        process.exit(1); // ❌ Prevent server crash by exiting
    }
}

// ✅ Start Server
startServer();
