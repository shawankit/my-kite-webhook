// returns an HTML string containing a styled table of orders
async function getOrdersHTML(kc) {
    try {
      const orders = await kc.getOrders();
  
      if (!Array.isArray(orders) || orders.length === 0) {
        return `
          <!doctype html>
          <html>
            <head><meta charset="utf-8"><title>Orders</title></head>
            <body style="font-family: Arial,Helvetica,sans-serif; padding:18px;">
              <h2>Orders</h2>
              <p>No orders found.</p>
            </body>
          </html>
        `;
      }
  
      // helper to escape HTML
      const escape = (s) =>
        (s === null || s === undefined) ? "" : String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
  
      // choose columns we care about (adjust as needed)
      const cols = [
        { key: "order_id", label: "Order ID" },
        { key: "tradingsymbol", label: "Symbol" },
        { key: "exchange", label: "Exchange" },
        { key: "transaction_type", label: "Side" },
        { key: "quantity", label: "Qty" },
        { key: "filled_quantity", label: "Filled" },
        { key: "status", label: "Status" },
        { key: "order_type", label: "Type" },
        { key: "price", label: "Price" },
        { key: "average_price", label: "Avg Price" },
        { key: "placed_by", label: "Placed By" },
        { key: "created_at", label: "Created At" }
      ];
  
      // build rows
      const rowsHtml = orders.map(o => {
        return `<tr>
          ${cols.map(c => `<td>${escape(o[c.key])}</td>`).join("")}
        </tr>`;
      }).join("\n");
  
      // build header HTML
      const headerHtml = cols.map(c => `<th>${escape(c.label)}</th>`).join("");
  
      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Orders</title>
            <style>
              body { font-family: Arial, Helvetica, sans-serif; padding: 18px; color: #222; }
              table { border-collapse: collapse; width: 100%; max-width: 1200px; }
              th, td { border: 1px solid #e1e4e8; padding: 8px 10px; text-align: left; font-size: 14px; }
              th { background: #f6f8fa; font-weight: 600; }
              tr:nth-child(even) td { background: #fbfbfb; }
              caption { font-size: 1.15rem; margin-bottom: 8px; font-weight: 700; }
              .muted { color: #666; font-size: 0.9rem; margin-top: 10px; }
              .wrap { overflow-x:auto; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <table>
                <caption>Orders (${orders.length})</caption>
                <thead><tr>${headerHtml}</tr></thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
            <div class="muted">Generated at: ${new Date().toLocaleString()}</div>
          </body>
        </html>
      `;
  
      return html;
  
    } catch (err) {
      const msg = (err && err.message) ? escape(err.message) : "Unknown error";
      return `
        <!doctype html>
        <html>
          <head><meta charset="utf-8"><title>Orders - Error</title></head>
          <body style="font-family: Arial,Helvetica,sans-serif; padding:18px;">
            <h2>Error fetching orders</h2>
            <pre>${msg}</pre>
          </body>
        </html>
      `;
    }
  
    // small helper inside function scope
    function escape(s) {
      return (s === null || s === undefined) ? "" : String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
  }


module.exports = { getOrdersHTML };
  