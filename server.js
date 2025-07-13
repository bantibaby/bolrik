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

const PORT = process.env.PORT || 8080;

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


hbs.registerHelper('lowercase', function (str) {
    return str.toLowerCase();
});

// Register Handlebars helpers for welcome bonus calculations
hbs.registerHelper('calculateProgressPercentage', function(progress) {
    return Math.min(progress || 0, 100);
});

hbs.registerHelper('calculateBetsPercentage', function(betsPlaced) {
    return Math.min((betsPlaced || 0) * 5, 100); // 5% per bet, max 100%
});

hbs.registerHelper('calculateAvailableBonus', function(bonusAmount) {
    return Math.floor((bonusAmount || 0) * 0.3);
});

hbs.registerHelper('calculateLockedBonus', function(bonusAmount) {
    return Math.ceil((bonusAmount || 0) * 0.7);
});

hbs.registerHelper('subtract', function(a, b) {
    return a - b;
});

hbs.registerHelper('lessThan', function(a, b) {
    return a < b;
});

hbs.registerHelper('formatDate', function(date) {
    return new Date(date).toLocaleDateString('hi-IN');
});

// नए हेल्पर फंक्शंस
// डिपॉजिट की गणना करने के लिए
hbs.registerHelper('calculateTotalDeposits', function(deposits) {
    if (!deposits || !deposits.length) return 0;
    let total = 0;
    deposits.forEach(deposit => {
        if (deposit.status === "Approved") {
            total += deposit.amount;
        }
    });
    return total;
});

// डिपॉजिट राशि के अनुसार विथड्रॉ लिमिट्स प्राप्त करने के लिए
hbs.registerHelper('getWithdrawLimits', function(totalDeposits) {
    if (totalDeposits >= 1500) {
        return { count: 7, amount: 1050 };
    } else if (totalDeposits >= 1000) {
        return { count: 6, amount: 850 };
    } else if (totalDeposits >= 500) {
        return { count: 4, amount: 550 };
    } else if (totalDeposits >= 300) {
        return { count: 3, amount: 350 };
    }
    return { count: 0, amount: 0 };
});

// पूरे किए गए विथड्रॉ की गिनती के लिए
hbs.registerHelper('countCompletedWithdrawals', function(withdrawals) {
    if (!withdrawals || !withdrawals.length) return 0;
    return withdrawals.filter(w => w.status === "Approved").length;
});

// विथड्रॉ प्रोग्रेस बार का प्रतिशत कैलकुलेट करने के लिए
hbs.registerHelper('calculateWithdrawalPercentage', function(completed, total) {
    if (!total) return 0;
    return Math.min((completed / total) * 100, 100);
});

// क्या विथड्रॉ लिमिट पूरी हो गई है
hbs.registerHelper('isWithdrawLimitReached', function(completed, total) {
    return completed >= total;
});

// क्वालिफाइड रेफरल यूजर्स की गिनती के लिए (सरवर साइड में वास्तविक लॉजिक होगी)
hbs.registerHelper('countQualifiedReferredUsers', function(referredUsers) {
    // यह एक प्लेसहोल्डर है, वास्तविक लॉजिक बैकएंड में होगी
    return (referredUsers && referredUsers.length) || 0;
});

// रेफरल प्रोग्रेस बार का प्रतिशत कैलकुलेट करने के लिए
hbs.registerHelper('calculateReferralPercentage', function(current, target) {
    if (!target) return 0;
    return Math.min((current / target) * 100, 100);
});

// क्या पर्याप्त रेफरल्स हैं
hbs.registerHelper('hasEnoughReferrals', function(count, target) {
    return count >= target;
});

// अतिरिक्त विथड्रॉ संख्या प्राप्त करने के लिए
hbs.registerHelper('getAdditionalWithdrawals', function(referralCount) {
    if (referralCount >= 10) return "असीमित";
    if (referralCount >= 8) return 5;
    if (referralCount >= 6) return 5;
    if (referralCount >= 4) return 5;
    if (referralCount >= 2) return 4;
    return 0;
});

// नई हेल्पर फंक्शंस - रेफरल सिस्टम के लिए
hbs.registerHelper('add', function(a, b) {
    return a + b;
});

hbs.registerHelper('subtract', function(a, b) {
    return a - b;
});

hbs.registerHelper('multiply', function(a, b) {
    return a * b;
});

hbs.registerHelper('divide', function(a, b) {
    return a / b;
});

hbs.registerHelper('lt', function(a, b) {
    return a < b;
});

hbs.registerHelper('gt', function(a, b) {
    return a > b;
});

hbs.registerHelper('eq', function(a, b) {
    return a === b;
});

hbs.registerHelper('not', function(a) {
    return !a;
});

hbs.registerHelper('lessThan', function(a, b) {
    return a < b;
});

hbs.registerHelper('getAdditionalWithdrawsFromReferrals', function(qualifiedReferredUsers, referralsBeforeLimitCross) {
    // लिमिट क्रॉस के बाद जोड़े गए रेफरल्स
    const newReferrals = qualifiedReferredUsers - (referralsBeforeLimitCross || 0);
    
    if (qualifiedReferredUsers >= 10) return Infinity; // असीमित विथड्रॉल
    if (newReferrals >= 3) return 5; // 3 या अधिक नए रेफरल्स
    if (newReferrals >= 2) return 4; // 2 नए रेफरल्स
    return 0; // अभी तक कोई नए रेफरल्स नहीं
});

hbs.registerHelper('getRequiredReferralsForNextPhase', function(nextPhase, totalDeposits) {
    // अगले विथड्रॉ फेज में जाने के लिए आवश्यक रेफरल्स
    if (nextPhase <= 1) {
        // पहला फेज, 300-499 डिपॉजिट वाले यूजर्स के लिए 2 रेफरल्स
        // 500+ डिपॉजिट वाले यूजर्स के लिए भी 2 रेफरल्स
        return 2;
    } else if (nextPhase <= 3) {
        // दूसरा और तीसरा फेज (अधिक रेफरल्स आवश्यक)
        return 2;
    } else {
        // चौथा और उसके बाद के फेज
        return 3;
    }
});

hbs.registerHelper('getNextPhaseWithdrawCount', function(nextPhase) {
    if (nextPhase <= 1 && totalDeposits < 500) {
        return 4; // 300-499 डिपॉजिट वाले यूजर्स के लिए 4 विथड्रॉ
    }
    return 5; // बाकी सभी के लिए 5 विथड्रॉ
});

// क्या असीमित विथड्रॉ हैं
hbs.registerHelper('hasUnlimitedWithdrawals', function(referralCount) {
    return referralCount >= 10;
});

hbs.registerHelper("incrementedIndex", (index) => index + 1);

// ✅ Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: "*" }));

// ✅ MongoDB Connection Before Using Sessions
const mongoURI = process.env.MONGO_URI;

// Set up mongoose connection event handlers globally
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected, attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB reconnected successfully');
});

async function startServer() {
    try {
        // Connect to MongoDB with retry logic
        let retries = 5;
        while (retries > 0) {
            try {
                await connectDB();
                console.log("✅ MongoDB Connected Successfully");
                break; // Connection successful, exit the retry loop
            } catch (error) {
                retries--;
                console.error(`MongoDB connection attempt failed. ${retries} retries left.`, error.message);
                if (retries === 0) {
                    console.warn("All MongoDB connection attempts failed, but continuing with server startup");
                    break; // Continue with server startup even if MongoDB connection fails
                }
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, (5 - retries) * 2000));
            }
        }

        // ✅ Secure Session Middleware with MongoDB Store
        app.use(session({
            secret: process.env.SESSION_SECRET || "mysecret",
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({ 
                mongoUrl: mongoURI, 
                collectionName: "sessions",
                ttl: 24 * 60 * 60, // Session TTL in seconds (1 day)
                autoRemove: 'native', // Use MongoDB's TTL index
                touchAfter: 24 * 3600, // Only update session if 24 hours have passed
                crypto: {
                    secret: process.env.SESSION_SECRET || "mysecret" // Encrypt session data
                },
                // Improved connection options
                clientPromise: mongoose.connection.asPromise().then(connection => connection.getClient()),
                stringify: false, // Don't stringify session data (better performance)
                autoReconnect: true, // Auto reconnect to MongoDB
                mongoOptions: {
                    // useUnifiedTopology: true,
                    serverSelectionTimeoutMS: 30000,
                    socketTimeoutMS: 45000
                }
            }),
            cookie: { 
                maxAge: 1000 * 60 * 60 * 24, 
                secure: false, // Set to false for now to fix authentication issues
                httpOnly: true,
                sameSite: "lax" // Changed from "strict" to "lax" for better compatibility
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
                // सिर्फ़ latest 10 results लाएँ
                const results = await Result.find().sort({ resultNumber: -1 }).limit(10);
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
            res.locals.baseURL = process.env.BASE_URL || "https://bolrik-production.up.railway.app/";
            next();
        });
        
        // ✅ Global Error Handling
        app.use((err, req, res, next) => {
            console.error("❌ Server Error:", err);
            res.status(500).render("500.hbs", { message: "Internal Server Error" });
        });

        // ✅ Start Server
        const PORT = process.env.PORT || 4000;  // Railway ka PORT ya fallback
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
    } catch (error) {
        console.error("❌ MongoDB Connection Failed:", error);
        process.exit(1); // ❌ Prevent server crash by exiting
    }
}

// ✅ Start Server
startServer();

// Add greaterThan helper
hbs.registerHelper('greaterThan', function(a, b) {
    return a > b;
});

