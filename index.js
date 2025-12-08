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
    APOLLOTYRE: 1700,
    ASTRAL: 367,
    ABFRL: 2600,
    ALKEM: 200,
    AARTIIND: 1000,
    ABB: 250,
    BEL: 5700,
    AUBANK: 1000,
    AXISBANK: 625,
    BAJFINANCE: 125,
    BALKRISIND: 300,
    BATAINDIA: 375,
    BERGEPAINT: 1100,
    ASHOKLEY: 5000,
    ABBOTINDIA: 40,
    ABCAPITAL: 5400,
    COFORGE: 150,
    CUMMINSIND: 600,
    ASIANPAINT: 200,
    ADANIENT: 300,
    ADANIPORTS: 800,
    "BAJAJ-AUTO": 250,
    DIVISLAB: 200,
    AMBUJACEM: 1800,
    DIXON: 200,
    APOLLOHOSP: 125,
    EICHERMOT: 175,
    GODREJCP: 1000,
    GRASIM: 475,
    GUJGASLTD: 1250,
    ATUL: 75,
    HCLTECH: 700,
    HDFCLIFE: 1100,
    BALRAMCHIN: 1600,
    BANDHANBNK: 2500,
    BHARATFORG: 1000,
    IDFC: 10000,
    BHARTIARTL: 950,
    BHEL: 10500,
    BOSCHLTD: 50,
    BPCL: 1800,
    BRITANNIA: 200,
    BSOFT: 2000,
    IDFCFIRSTB: 15000,
    CANFINHOME: 975,
    INDHOTEL: 2000,
    CHOLAFIN: 1250,
    COLPAL: 350,
    COROMANDEL: 700,
    CROMPTON: 1800,
    DABUR: 1250,
    DALBHARAT: 500,
    INDIGO: 300,
    DEEPAKNTR: 300,
    DELTACORP: 2800,
    BANKBARODA: 5850,
    DLF: 1650,
    INFY: 400,
    DRREDDY: 125,
    ESCORTS: 275,
    MARUTI: 100,
    FEDERALBNK: 5000,
    MCDOWELL_N: 700,
    GAIL: 9150,
    MFSL: 800,
    GLENMARK: 1450,
    GMRINFRA: 22500,
    GNFC: 1300,
    NATIONALUM: 7500,
    HAL: 300,
    HAVELLS: 500,
    HDFCBANK: 550,
    NAUKRI: 150,
    HEROMOTOCO: 300,
    HINDALCO: 1400,
    HINDCOPPER: 5300,
    HINDPETRO: 2700,
    IBULHSGFIN: 5100,
    ICICIGI: 500,
    ICICIPRULI: 1500,
    IEX: 3750,
    IGL: 1375,
    INDIACEM: 2900,
    INDIAMART: 300,
    INDUSTOWER: 3400,
    INTELLECT: 1300,
    IOC: 9750,
    IPCALAB: 650,
    IRCTC: 875,
    OFSS: 200,
    PAGEIND: 15,
    JKCEMENT: 250,
    PERSISTENT: 175,
    PIIND: 250,
    KOTAKBANK: 400,
    SBICARD: 800,
    SBILIFE: 750,
    LTFH: 8924,
    LALPATHLAB: 300,
    LAURUSLABS: 1700,
    LICHSGFIN: 2000,
    LT: 300,
    LTIM: 150,
    LTTS: 200,
    AUROPHARMA: 1100,
    LUPIN: 850,
    M_M: 700,
    M_MFIN: 4000,
    MARICO: 1200,
    METROPOLIS: 400,
    BAJAJFINSV: 500,
    CIPLA: 650,
    MRF: 10,
    EXIDEIND: 3600,
    MUTHOOTFIN: 550,
    NAVINFLUOR: 150,
    TCS: 175,
    TECHM: 600,
    TRENT: 400,
    TVSMOTOR: 700,
    BIOCON: 2500,
    NESTLEIND: 40,
    WIPRO: 1500,
    NTPC: 3000,
    OBEROIRLTY: 700,
    ONGC: 3850,
    CUB: 5000,
    CHAMBLFERT: 1900,
    PETRONET: 3000,
    PIDILITIND: 250,
    PNB: 16000,
    GRANULES: 2000,
    POWERGRID: 2700,
    RAMCOCEM: 850,
    RBLBANK: 5000,
    HDFCAMC: 300,
    RECLTD: 8000,
    RELIANCE: 250,
    SAIL: 8000,
    SBIN: 1500,
    SHREECEM: 25,
    SHRIRAMFIN: 600,
    SRF: 375,
    SUNPHARMA: 700,
    COALINDIA: 4200,
    SYNGENE: 1000,
    HINDUNILVR: 300,
    TATACHEM: 550,
    TATACOMM: 500,
    TATACONSUM: 900,
    ICICIBANK: 700,
    TATAMOTORS: 1425,
    TATAPOWER: 3375,
    INDUSINDBK: 500,
    TITAN: 375,
    TORNTPHARM: 500,
    UBL: 400,
    ULTRACEMCO: 100,
    UPL: 1300,
    VOLTAS: 600,
    JUBLFOOD: 1250,
    ZEEL: 3000,
    ZYDUSLIFE: 1800,
    MANAPPURAM: 6000,
    ACC: 300,
    VEDL: 2000,
    JINDALSTEL: 1250,
    JSWSTEEL: 1350,
    CONCOR: 1000,
    NMDC: 4500,
    POLYCAB: 300,
    SIEMENS: 275,
    CANBK: 2700,
    MCX: 400,
    MGL: 800,
    MOTHERSON: 7100,
    ITC: 1600,
    PVRINOX: 407,
    SUNTV: 1500,
    PEL: 750,
    PFC: 6200,
    TATASTEEL: 5500,
    GODREJPROP: 475,
    IDEA: 80000,
    MPHASIS: 275
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
    // const optionRegex = /^([A-Z]+)(\d{2}[A-Z]{3})(\d+)(CE|PE)$/;
    // const opt = symbol.match(optionRegex);
  
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
      type: "EQUITY",
      underlying: symbol,
      tradingsymbol: symbol,
      lotSize: LOT_SIZES[symbol] || 1,
      exchange: "NSE",
    };
  }
  
  
  // ---------------- PLACE ORDER ----------------
  // ---------------- PLACE ORDER ----------------
async function placeOrder(symbolInfo, signal) {
    const isFNO = symbolInfo.exchange === "NFO";
  
    const orderParams = {
        exchange: "NSE",
        tradingsymbol: symbolInfo.tradingsymbol,
        transaction_type: signal.toUpperCase(),
        quantity: symbolInfo.lotSize,
        product:  "NRML",
        order_type: "MARKET"    // F or LIMIT
    };
  
    console.log("📌 Placing Order:", orderParams);
  
    try {
      const kc = getKiteInstance();
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
