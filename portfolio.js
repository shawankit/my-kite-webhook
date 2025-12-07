// portfolio.js
const logger = require("./logger");

async function getHoldingsHTML(kc) {
    try {
        const holdings = await kc.getHoldings();
        logger.info("Fetched holdings", { count: holdings.length });

        // Generate HTML table
        let html = `
            <html>
            <head>
                <style>
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                    th { background: #f2f2f2; }
                </style>
            </head>
            <body>
                <h2>Portfolio Holdings</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Symbol</th>
                            <th>Quantity</th>
                            <th>Avg Price</th>
                            <th>LTP</th>
                            <th>P&L</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        holdings.forEach(h => {
            html += `
                <tr>
                    <td>${h.tradingsymbol}</td>
                    <td>${h.quantity}</td>
                    <td>${h.average_price}</td>
                    <td>${h.last_price}</td>
                    <td>${(h.last_price - h.average_price) * h.quantity}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        return html;
    } catch (err) {
        logger.error("Error fetching holdings", { error: err.message });
        throw err;
    }
}

module.exports = { getHoldingsHTML };
