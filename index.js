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


app.get("/", (req, res) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Server Status</title>
          <style>
            body {
              font-family: Arial;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f0f0f0;
            }
            h1 {
              color: #333;
            }
            .btn {
              padding: 10px 20px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 5px;
              text-decoration: none;
              cursor: pointer;
              font-size: 16px;
            }
            .btn:hover {
              background: #0056b3;
            }
          </style>
        </head>
        <body>
          <h1>Server Working 🚀</h1>
          <a href="/login" class="btn">Login</a>
        </body>
      </html>
    `;
    res.send(html);
  });
  

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


const LOT_SIZES = {
    NIFTY: 25,
    BANKNIFTY: 15,
    FINNIFTY: 40,
    MIDCPNIFTY: 75,
    RELIANCE: 250,
    TCS: 150,
    HDFCBANK: 550,
    ICICIBANK: 700,
    SBIN: 1500,
    INFY: 300,
    AXISBANK: 300,
    KOTAKBANK: 400,
    LT: 150,
  };


// ---------------- DETECT EXCHANGE ----------------
function detectExchange(symbol) {
    if (symbol.endsWith("FUT")) return "NFO";
    if (symbol.endsWith("CE")) return "NFO";
    if (symbol.endsWith("PE")) return "NFO";
    return "NSE"; // normal equity
  }
  
  // ---------------- SYMBOL PARSER ----------------
  function parseSymbol(symbol) {
    // OPTIONS → BANKNIFTY24FEB43000CE
    const optionRegex = /^([A-Z]+)(\d{2}[A-Z]{3})(\d+)(CE|PE)$/;
    const opt = symbol.match(optionRegex);
  
    if (opt) {
      const [, underlying, expiry, strike, type] = opt;
      return {
        type: "OPTION",
        underlying,
        expiry,
        strike: Number(strike),
        optionType: type,
        tradingsymbol: `${underlying}${expiry}${strike}${type}`,
        lotSize: LOT_SIZES[underlying] || 1,
        exchange: detectExchange(type), // NFO
      };
    }
  
    // FUTURES → NIFTY24FEBFUT
    const futureRegex = /^([A-Z]+)(\d{2}[A-Z]{3})FUT$/;
    const fut = symbol.match(futureRegex);
  
    if (fut) {
      const [, underlying, expiry] = fut;
      return {
        type: "FUTURE",
        underlying,
        expiry,
        tradingsymbol: `${underlying}${expiry}FUT`,
        lotSize: LOT_SIZES[underlying] || 1,
        exchange: "NFO",
      };
    }
  
    // EQUITY → RELIANCE
    return {
      type: "EQUITY",
      underlying: symbol,
      tradingsymbol: symbol,
      lotSize: 1,
      exchange: "NSE",
    };
  }
  
  
  // ---------------- PLACE ORDER ----------------
  async function placeOrder(data) {
    const orderParams = {
        exchange: data.exchange,               // NSE or NFO
        tradingsymbol: data.tradingsymbol,     // FUT or CE/PE or cash symbol
        transaction_type: "BUY",
        quantity: data.lotSize,
        product: data.exchange === "NFO" ? "NRML" : "MIS",
        order_type: "MARKET",
        variety: "regular",
    };
    
  
    console.log("📌 Placing Order:", orderParams);
  
    try {
      const order = await kc.placeOrder("regular", orderParams);
      console.log("✅ Order Placed:", order);
      return order;
    } catch (err) {
      console.error("❌ Order Error:", err.message);
      logger.error("Webhook Order Error: " + err.message);
    }
  }
  

// ---------------- WEBHOOK ROUTE ----------------
app.post("/webhook", async (req, res) => {
    logger.info("Webhook payload: " + JSON.stringify(req.body));

    try {
        //const kc = getKiteInstance();

        // const symbol = req.body.stocks?.split(",")[0];
        // const tradingSymbol = symbol.toUpperCase();

        // logger.info(`Placing BUY order for ${tradingSymbol}`);

        // const order = await kc.placeOrder("regular", {
        //     exchange: "NSE",
        //     tradingsymbol: tradingSymbol,
        //     transaction_type: "BUY",
        //     quantity: 1,
        //     product: "MIS",
        //     order_type: "MARKET"
        // });

        const symbol = req.body?.stocks?.split(",")[0];

        if (!symbol) return res.json({ error: "No symbol found" });
    
        const parsed = parseSymbol(symbol);
        if (!parsed) return res.json({ error: "Invalid symbol format" });
    
        console.log("Parsed:", parsed);
    
        const order = await placeOrder(parsed);
        
        logger.info("Order Placed: " + JSON.stringify(order));

        res.json({
          status: "ok",
          parsed,
          order,
        });
        
        //res.json({ status: "success", order });

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
