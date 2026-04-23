import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

// Bypass TLS validation for KiotViet API cert misconfiguration
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const KIOTVIET_CLIENT_ID = process.env.KIOTVIET_CLIENT_ID || "dbae08de-7391-412d-b2f3-bdffc06f1f5a";
const KIOTVIET_CLIENT_SECRET = process.env.KIOTVIET_CLIENT_SECRET || "837AB25327544A21C9143381DFD33AC7C3668E97";
const KIOTVIET_RETAILER = process.env.KIOTVIET_RETAILER || "fugalo";

async function getKiotVietToken() {
  const params = new URLSearchParams();
  params.append("client_id", KIOTVIET_CLIENT_ID);
  params.append("client_secret", KIOTVIET_CLIENT_SECRET);
  params.append("grant_type", "client_credentials");
  params.append("scopes", "PublicApi.Access");

  const response = await fetch("https://id.kiotviet.vn/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get KiotViet token: ${errorText}`);
  }

  const data = await response.json() as any;
  return data.access_token;
}

// Fetch helper with pagination handling up to 500 items max for sync (can be extended)
async function fetchKiotVietPath(token: string, path: string, retries = 3): Promise<any> {
  try {
    const response = await fetch(`https://public.api.kiotviet.vn/${path}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Retailer": KIOTVIET_RETAILER
      }
    });

    if (!response.ok) {
      if ((response.status === 503 || response.status === 429) && retries > 0) {
        console.log(`Rate limited (${response.status}) on ${path}. Retrying in 2 seconds...`);
        await new Promise(r => setTimeout(r, 2000));
        return fetchKiotVietPath(token, path, retries - 1);
      }
      
      const errorText = await response.text();
      if (errorText.includes('<html') || errorText.includes('<!DOCTYPE')) {
         console.warn("KiotViet returned 503 IP block. Falling back to Demo Sync Mode.");
         return { isMock: true, data: [] };
      }
      throw new Error(`KiotViet API Error: ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    if (retries > 0 && (error.message.includes('fetch failed') || error.message.includes('timeout'))) {
      console.log(`Network error: ${error.message}. Retrying in 2 seconds...`);
      await new Promise(r => setTimeout(r, 2000));
      return fetchKiotVietPath(token, path, retries - 1);
    }
    console.warn("Network error during KiotViet fetch. Falling back to Demo Sync Mode.");
    return { isMock: true, data: [] };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to sync partners
  app.get("/api/kiotviet/sync-partners", async (req, res) => {
    try {
      const token = await getKiotVietToken();
      
      const fetchAll = async (endpoint: string, maxPages = 10) => {
        let allData: any[] = [];
        let hasMore = true;
        let isMockTriggered = false;

        while (hasMore && allData.length < maxPages * 100) {
          const skip = allData.length;
          const url = `${endpoint}?pageSize=100&skip=${skip}`;
          const responseData = await fetchKiotVietPath(token, url);
          
          if (responseData && responseData.isMock) {
              isMockTriggered = true;
              break;
          }
          
          if (responseData && responseData.data && responseData.data.length > 0) {
            allData = allData.concat(responseData.data);
            if (responseData.data.length < 100) {
               hasMore = false;
            } else {
               // Delay 1000ms to avoid breaking KiotViet rate limits
               await new Promise(r => setTimeout(r, 1000));
            }
          } else {
            hasMore = false;
          }
        }
        return { data: allData, isMock: isMockTriggered };
      };

      const customersRes = await fetchAll("customers");
      const suppliersRes = await fetchAll("suppliers");

      res.json({
        success: true,
        isMock: customersRes.isMock || suppliersRes.isMock,
        customers: customersRes.data,
        suppliers: suppliersRes.data
      });
    } catch (error: any) {
      console.error("Sync Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // API Route to sync products
  app.get("/api/kiotviet/sync-products", async (req, res) => {
    try {
      const token = await getKiotVietToken();
      let allData: any[] = [];
      let hasMore = true;
      let isMockTriggered = false;

      while (hasMore && allData.length < 10000) { // Limit to 10000 
        const skip = allData.length;
        const url = `products?pageSize=100&skip=${skip}&includeInventory=true`;
        const responseData = await fetchKiotVietPath(token, url);
        
        if (responseData && responseData.isMock) {
            isMockTriggered = true;
            break;
        }
        
        if (responseData && responseData.data && responseData.data.length > 0) {
          allData = allData.concat(responseData.data);
          if (responseData.data.length < 100) {
             hasMore = false;
          } else {
             await new Promise(r => setTimeout(r, 1000));
          }
        } else {
          hasMore = false;
        }
      }

      res.json({
        success: true,
        isMock: isMockTriggered,
        products: allData
      });
    } catch (error: any) {
      console.error("Sync Products Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
