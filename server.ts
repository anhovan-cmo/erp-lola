import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

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
async function fetchKiotVietPath(token: string, path: string) {
  const response = await fetch(`https://public.api.kiotviet.vn/${path}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Retailer": KIOTVIET_RETAILER
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KiotViet API Error: ${errorText}`);
  }

  return await response.json() as any;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to sync partners
  app.get("/api/kiotviet/sync-partners", async (req, res) => {
    try {
      const token = await getKiotVietToken();
      
      // Fetch customers & suppliers from KiotViet
      // Getting 100 items for simplicity block for this demo.
      const customersData = await fetchKiotVietPath(token, "customers?pageSize=100");
      const suppliersData = await fetchKiotVietPath(token, "suppliers?pageSize=100");

      res.json({
        success: true,
        customers: customersData.data || [],
        suppliers: suppliersData.data || []
      });
    } catch (error: any) {
      console.error("Sync Error:", error);
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
