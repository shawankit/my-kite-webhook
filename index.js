require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const { KiteConnect } = require("kiteconnect");
const logger = require("./logger");
const { getHoldingsHTML } = require("./portfolio");
const moment = require("moment");
const { getOrdersHTML } = require("./orders");
const { getPositionsHTML } = require("./positions");

const app = express();
app.use(bodyParser.json());

// ---------------- MEMORY STORE ----------------
global.requestToken = null;
global.kiteAccessToken = null;

// ---------------- MEMORY STORE ANKIT ----------------
global.requestTokenAnkit = null;
global.kiteAccessTokenAnkit = null;


// Load access_token from file (optional)
if (fs.existsSync("access_token.txt")) {
    global.kiteAccessToken = fs.readFileSync("access_token.txt", "utf8").trim();
    logger.info("Loaded access_token from file");
}

if (fs.existsSync("access_token_ankit.txt")) {
    global.kiteAccessTokenAnkit = fs.readFileSync("access_token_ankit.txt", "utf8").trim();
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

function getKiteInstanceAnkit() {
    if (!global.kiteAccessTokenAnkit) {
        logger.error("Access token missing");
        throw new Error("Access Token not set");
    }

    const kc = new KiteConnect({
        api_key: process.env.KITE_API_KEY_ANKIT
    });

    kc.setAccessToken(global.kiteAccessTokenAnkit);
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

app.get("/login-ankit", (req, res) => {
    try {
        const kc = new KiteConnect({ api_key: process.env.KITE_API_KEY_ANKIT });
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

app.get("/request-token-ankit", async (req, res) => {
    try {
        const { request_token } = req.query;

        if (!request_token) {
            logger.error("Request token missing");
            return res.status(400).send("Missing request_token");
        }

        logger.info("Request Token Received");
        global.requestTokenAnkit = request_token;

        const kc = new KiteConnect({ api_key: process.env.KITE_API_KEY_ANKIT });
        const session = await kc.generateSession(
            request_token,
            process.env.KITE_API_SECRET_ANKIT
        );

        global.kiteAccessTokenAnkit = session.access_token;
        fs.writeFileSync("access_token_ankit.txt", session.access_token);

        logger.info("Access token generated and stored");

        res.send("Access Token Generated Successfully.");

    } catch (err) {
        logger.error("Error generating access token: " + err.message);
        res.status(500).send("Error generating access token");
    }
});




  function generateFuturesSymbol(underlyingSymbol) {
    // Get the current date using moment
    const now = moment();
    const yearPart = now.format('YY');
    const monthPart = now.format('MMM').toUpperCase();
    const contractType = 'FUT';
    const tradingSymbol = `${underlyingSymbol}${yearPart}${monthPart}${contractType}`;

    return tradingSymbol;
}
  
  // ---------------- SYMBOL PARSER ----------------
  function parseSymbol(symbol) {
    // OPTIONS → BANKNIFTY24FEB43000CE
    const optionRegex = /^([A-Z]+)(\d{2}[A-Z]{3})(\d+)(CE|PE)$/;
    const opt = symbol.match(optionRegex);
  
    // if (opt) {
    //   const [, underlying, expiry, strike, type] = opt;
    //   return {
    //     type: "OPTION",
    //     underlying,
    //     expiry,
    //     strike: Number(strike),
    //     optionType: type,
    //     tradingsymbol: `${underlying}${expiry}${strike}${type}`,
    //     lotSize: LOT_SIZES[underlying] || 1,
    //     exchange: detectExchange(type), // NFO
    //   };
    // }
  
    // // FUTURES → NIFTY24FEBFUT
    // const futureRegex = /^([A-Z]+)(\d{2}[A-Z]{3})FUT$/;
    // const fut = symbol.match(futureRegex);
  
    // if (fut) {
    //   const [, underlying, expiry] = fut;
    //   return {
    //     type: "FUTURE",
    //     underlying,
    //     expiry,
    //     tradingsymbol: `${underlying}${expiry}FUT`,
    //     lotSize: LOT_SIZES[underlying] || 1,
    //     exchange: "NFO",
    //   };
    // }
  
    // EQUITY → RELIANCE
    return {
      type: "FUTURE",
      underlying: symbol,
      tradingsymbol: generateFuturesSymbol(symbol),
      lotSize: 1,
      exchange: "NFO",
    };
  }

  async function getLotSize(kc, symbol) {
    const instruments = await kc.getInstruments();
    
    const fut = instruments.find(i =>
        i.segment === "NFO-FUT" &&
        i.instrument_type === "FUT" &&
        i.tradingsymbol.startsWith(symbol.toUpperCase())
    );

    return fut ? fut.lot_size : 1;
}
  
  
  // ---------------- PLACE ORDER ----------------
  // ---------------- PLACE ORDER ----------------
async function placeOrder(symbolInfo, signal) {
    const isFNO = symbolInfo.exchange === "NFO";

  
    try {
      const kc = getKiteInstance();
      const ls = await getLotSize(kc, symbolInfo.underlying);
      const orderParams = {
        exchange: symbolInfo.exchange,              // NSE or NFO
        tradingsymbol: symbolInfo.tradingsymbol,    // FUT or CE/PE or Equity
        transaction_type: signal.toUpperCase() === "SELL" ? "SELL" : "BUY",
        quantity: ls,               // Correct lot size
        product: isFNO ? "NRML" : "MIS",            // FNO = NRML, Equity = MIS
        order_type: "MARKET",
        variety: "regular",
    };
      const order = await kc.placeOrder("regular", orderParams);
  
      console.log("✅ Order Placed:", order);
      return order;
    } catch (err) {

      console.error("❌ Order Error:", err.message);
      logger.error("Webhook Order Error: " + err.message);
    }
  }

  async function placeOrderAnkit(symbolInfo, signal) {
    const isFNO = symbolInfo.exchange === "NFO";

  
    try {
      const kc = getKiteInstanceAnkit();
      const ls = await getLotSize(kc, symbolInfo.underlying);
      const orderParams = {
        exchange: symbolInfo.exchange,              // NSE or NFO
        tradingsymbol: symbolInfo.tradingsymbol,    // FUT or CE/PE or Equity
        transaction_type: signal.toUpperCase() === "SELL" ? "SELL" : "BUY",
        quantity: ls,               // Correct lot size
        product: isFNO ? "NRML" : "MIS",            // FNO = NRML, Equity = MIS
        order_type: "MARKET",
        variety: "regular",
    };
      const order = await kc.placeOrder("regular", orderParams);
  
      console.log("✅ Order Placed:", order);
      return order;
    } catch (err) {

      console.error("❌ Order Error:", err.message);
      logger.error("Webhook Order Error: " + err.message);
    }
  }
  
  function detectSignal(text) {
    const t = text.toLowerCase();
    if (t.includes("short") || t.includes("sell")) return "SELL";
    if (t.includes("long") || t.includes("buy")) return "BUY";
    return "UNKNOWN";
  }

 


// ---------------- WEBHOOK ROUTE ----------------
app.post("/webhook", async (req, res) => {
    logger.info("Webhook payload: " + JSON.stringify(req.body));

    try {
        const symbol = req.body?.stocks?.split(",")[0];

        if (!symbol) return res.json({ error: "No symbol found" });
    
        const parsed = parseSymbol(symbol);
        if (!parsed) return res.json({ error: "Invalid symbol format" });

        const signal = detectSignal(req.body?.alert_name || req.body?.scan_name);
        
        //const order = await placeOrder(parsed, signal);
        const results = await Promise.allSettled([
            placeOrder(parsed, signal),
            placeOrderAnkit(parsed, signal)
        ]);

        const order1Result = results[0];
        const order2Result = results[1];

        // Prepare clean response
        const response = {
            status: "ok",
            parsed,
            order1: order1Result.status === "fulfilled"
                ? order1Result.value
                : { error: order1Result.reason?.message || order1Result.reason },

            order2: order2Result.status === "fulfilled"
                ? order2Result.value
                : { error: order2Result.reason?.message || order2Result.reason }
        };

        logger.info("Order1 Result: " + JSON.stringify(response.order1));
        logger.info("Order2 Result: " + JSON.stringify(response.order2));

        res.json(response);

        // logger.info("Order Placed: " + JSON.stringify(order));

        // const order2 = await placeOrderAnkit(parsed, signal);
        // logger.info("Order Placed: " + JSON.stringify(order2));

        // res.json({
        //   status: "ok",
        //   parsed,
        //   order,
        //   order2
        // });

    } catch (err) {const { request_token } = req.query;
        logger.error("Webhook Order Error: " + err.message);
        res.status(500).json({ status: "error", error: err.message });
    }
});

app.get("/portfolio/holdings", async (req, res) => {
    try {
        const { instance } = req.query;
        const kc = instance == 'Ankit' ? getKiteInstanceAnkit(): getKiteInstance();

        const html = await getHoldingsHTML(kc);
        res.send(html);

    } catch (err) {
        logger.error("Error generating holdings HTML", { error: err.message });
        res.status(500).send("Error loading holdings");
    }
});

app.get("/get-all-orders", async (req, res) => {
    try {
        const { instance } = req.query;
        const kc = instance == 'Ankit' ? getKiteInstanceAnkit(): getKiteInstance();

        const html = await getOrdersHTML(kc);
        res.send(html);

    } catch (err) {
        logger.error("Error generating holdings HTML", { error: err.message });
        res.status(500).send("Error loading holdings");
    }
});

app.get("/get-all-positions", async (req, res) => {
    try {
        const { instance } = req.query;
        const kc = instance == 'Ankit' ? getKiteInstanceAnkit(): getKiteInstance();

        const html = await getPositionsHTML(kc);
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
