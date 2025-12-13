//// -------------------- GET POSITIONS AS HTML TABLE --------------------
async function getPositionsHTML(kc) {
    try {
      const posData = await kc.getPositions();
  
      // Kite returns: { day: [...], net: [...] }
      const positions = posData?.net || [];
  
      const escape = (s) =>
        (s === null || s === undefined)
          ? ""
          : String(s)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;");
  
      if (positions.length === 0) {
        return `
        <!doctype html>
        <html>
        <head><meta charset="utf-8"><title>Positions</title></head>
        <body style="font-family:Arial;padding:20px;">
          <h2>No Open Positions</h2>
        </body>
        </html>`;
      }
  
      const cols = [
        { key: "tradingsymbol", label: "Symbol" },
        { key: "exchange", label: "Exchange" },
        { key: "product", label: "Product" },
        { key: "quantity", label: "Qty" },
        { key: "average_price", label: "Avg Price" },
        { key: "last_price", label: "LTP" },
        { key: "pnl", label: "P&L" },
        { key: "multiplier", label: "Multiplier" }
      ];
  
      // Calculate Total P&L
      const totalPnL = positions.reduce((sum, p) => sum + (Number(p.pnl) || 0), 0);
      const totalColor = totalPnL >= 0 ? "green" : "red";
  
      const headerHtml = cols.map(c => `<th>${escape(c.label)}</th>`).join("");
  
      const rowsHtml = positions.map(p => {
        const pnlColor = p.pnl >= 0 ? "green" : "red";
  
        return `
          <tr>
            ${cols.map(c => {
              if (c.key === "pnl") {
                return `<td style="color:${pnlColor};font-weight:600;">${escape(p[c.key])}</td>`;
              }
              return `<td>${escape(p[c.key])}</td>`;
            }).join("")}
          </tr>
        `;
      }).join("");
  
      // TOTAL ROW
      const totalRow = `
        <tr style="background:#f0f0f0;font-weight:bold;">
          <td colspan="6" style="text-align:right;">Total P&L:</td>
          <td style="color:${totalColor};font-size:16px;font-weight:700;">${totalPnL.toFixed(2)}</td>
          <td></td>
        </tr>
      `;
  
      const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Positions</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 18px; color: #222; }
            table { border-collapse: collapse; width: 100%; max-width: 1200px; }
            th, td { border: 1px solid #e1e4e8; padding: 8px 10px; text-align: left; }
            th { background: #f6f8fa; font-weight: 600; }
            tr:nth-child(even) td { background: #fbfbfb; }
            .wrap { overflow-x:auto; }
            .muted { margin-top: 10px; font-size: 12px; color:#666 }
          </style>
        </head>
        <body>
          <h2>Open Positions (${positions.length})</h2>
          <div class="wrap">
            <table>
              <thead><tr>${headerHtml}</tr></thead>
              <tbody>
                ${rowsHtml}
                ${totalRow}
              </tbody>
            </table>
          </div>
          <div class="muted">Generated at: ${new Date().toLocaleString()}</div>
        </body>
      </html>
      `;
  
      return html;
  
    } catch (err) {
      const errorMsg = err?.message || "Unknown error";
      return `
        <!doctype html>
        <html>
        <head><meta charset="utf-8"><title>Error</title></head>
        <body style="font-family:Arial;padding:20px;">
          <h2>Error fetching positions</h2>
          <pre>${errorMsg}</pre>
        </body>
        </html>`;
    }
  }
  


module.exports = { getPositionsHTML };