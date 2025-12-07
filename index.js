require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const { KiteConnect } = require("kiteconnect");
const logger = require("./logger");
const { getHoldingsHTML } = require("./portfolio");

const app = express();
app.use(bodyParser.json());

// ---------------- MEMORY STORE ----------------
global.requestToken = null;
global.kiteAccessToken = null;


// Load access_token from file (optional)
if (fs.existsSync("access_token.txt")) {
    global.kiteAccessToken = fs.readFileSync("access_token.txt", "utf8").trim();
    logger.info("Loaded access_token from file");
}

// ---------------- REQUEST LOGGING MIDDLEWARE ----------------
app.use((req, res, next) => {
    logger.info(`Incoming Request: ${req.method} ${req.url}`);
    next();
});

// ---------------- KITE HELPER ----------------
function getKiteInstance() {
    if (!global.kiteAccessToken) {
        logger.error("Access token missing");
        throw new Error("Access Token not set");
    }

    const kc = new KiteConnect({
        api_key: process.env.KITE_API_KEY
    });

    kc.setAccessToken(global.kiteAccessToken);
    return kc;
}

// ---------------- LOGIN ROUTE ----------------
app.get("/login", (req, res) => {
    try {
        const kc = new KiteConnect({ api_key: process.env.KITE_API_KEY });
        const loginURL = kc.getLoginURL();
        logger.info("Generated Kite login URL");
        res.redirect(loginURL);
    } catch (err) {
        logger.error("Login URL error: " + err.message);
        res.status(500).send("Could not generate login URL");
    }
});

// ---------------- REQUEST TOKEN CALLBACK ----------------
app.get("/request-token", async (req, res) => {
    try {
        const { request_token } = req.query;

        if (!request_token) {
            logger.error("Request token missing");
            return res.status(400).send("Missing request_token");
        }

        logger.info("Request Token Received");
        global.requestToken = request_token;

        const kc = new KiteConnect({ api_key: process.env.KITE_API_KEY });
        const session = await kc.generateSession(
            request_token,
            process.env.KITE_API_SECRET
        );

        global.kiteAccessToken = session.access_token;
        fs.writeFileSync("access_token.txt", session.access_token);

        logger.info("Access token generated and stored");

        res.send("Access Token Generated Successfully.");

    } catch (err) {
        logger.error("Error generating access token: " + err.message);
        res.status(500).send("Error generating access token");
    }
});

// ---------------- WEBHOOK ROUTE ----------------
app.post("/webhook", async (req, res) => {
    logger.info("Webhook payload: " + JSON.stringify(req.body));

    try {
        const kc = getKiteInstance();

        const symbol = req.body.stocks?.split(",")[0];
        const tradingSymbol = symbol.toUpperCase();

        logger.info(`Placing BUY order for ${tradingSymbol}`);

        const order = await kc.placeOrder("regular", {
            exchange: "NSE",
            tradingsymbol: tradingSymbol,
            transaction_type: "BUY",
            quantity: 1,
            product: "MIS",
            order_type: "MARKET"
        });

        logger.info("Order Placed: " + JSON.stringify(order));

        res.json({ status: "success", order });

    } catch (err) {
        logger.error("Webhook Order Error: " + err.message);
        res.status(500).json({ status: "error", error: err.message });
    }
});

app.get("/portfolio/holdings", async (req, res) => {
    try {
        const kc = getKiteInstance();

        const html = await getHoldingsHTML(kc);
        res.send(html);

    } catch (err) {
        logger.error("Error generating holdings HTML", { error: err.message });
        res.status(500).send("Error loading holdings");
    }
});


// ---------------- START SERVER ----------------
app.listen(process.env.PORT, () => {
    logger.info(`Server started on port ${process.env.PORT || 3000}`);
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});
