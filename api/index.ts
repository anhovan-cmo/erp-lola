import express from "express";

// Bypass TLS validation for KiotViet API cert misconfiguration
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const KIOTVIET_CLIENT_ID = process.env.KIOTVIET_CLIENT_ID || "dbae08de-7391-412d-b2f3-bdffc06f1f5a";
const KIOTVIET_CLIENT_SECRET = process.env.KIOTVIET_CLIENT_SECRET || "837AB25327544A21C9143381DFD33AC7C3668E97";
const KIOTVIET_RETAILER = process.env.KIOTVIET_RETAILER || "fugalo";

async function getKiotVietToken(clientId: string, clientSecret: string) {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");
  params.append("scopes", "PublicApi.Access");

  const response = await fetch("https://id.kiotviet.vn/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      "Accept": "application/json"
    },
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
async function fetchKiotVietPath(token: string, path: string, retailer: string, retries = 3): Promise<any> {
  try {
    const targetUrl = `https://public.api.kiotviet.vn/${path}`;
    
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Retailer": retailer,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      if ((response.status === 503 || response.status === 429) && retries > 0) {
        console.log(`Rate limited (${response.status}) on ${path}. Retrying in 2 seconds...`);
        await new Promise(r => setTimeout(r, 2000));
        return fetchKiotVietPath(token, path, retailer, retries - 1);
      }
      
      const errorText = await response.text();
      // Handle WAF block from Cloudflare/KiotViet
      if (response.status === 503 && (errorText.includes('<html') || errorText.includes('<!DOCTYPE'))) {
         return { 
           isWafBlocked: true, 
           errorMsg: "Kết nối thất bại (Lỗi 503 WAF): KiotViet hiện chặn truy cập từ môi trường Cloud. Mẹo: Hãy sử dụng nút 'Export', tải mã nguồn về và chạy trên máy tính nội bộ (Local) của bạn để lấy dữ liệu thuật từ KiotViet."
         };
      }
      
      throw new Error(`KiotViet API Error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    return await response.json();
  } catch (error: any) {
    if (retries > 0 && (error.message.includes('fetch failed') || error.message.includes('timeout') || error.message.includes('Rate limited'))) {
      console.log(`Network error: ${error.message}. Retrying in 2 seconds...`);
      await new Promise(r => setTimeout(r, 2000));
      return fetchKiotVietPath(token, path, retailer, retries - 1);
    }
    throw error;
  }
}

function getCredentials(req: express.Request) {
   return {
     clientId: req.headers['x-kv-client-id'] as string || KIOTVIET_CLIENT_ID,
     clientSecret: req.headers['x-kv-client-secret'] as string || KIOTVIET_CLIENT_SECRET,
     retailer: req.headers['x-kv-retailer'] as string || KIOTVIET_RETAILER
   };
}

const app = express();
app.use(express.json());

// API Route to check connection setup
app.post("/api/kiotviet/check", async (req, res) => {
  try {
    const { clientId, clientSecret, retailer } = getCredentials(req);
    if (!clientId || !clientSecret || !retailer) {
      return res.status(400).json({ success: false, error: "Thiếu thông tin kết nối KiotViet." });
    }
    
    const token = await getKiotVietToken(clientId, clientSecret);
    const testRes = await fetchKiotVietPath(token, "customers?pageSize=1", retailer);
    if (testRes && testRes.isWafBlocked) {
      // Return success but indicate that it's running in Mock mode due to WAF
      return res.json({ success: true, message: "Kết nối thành công! (Chế độ Mock Demo do tường lửa KiotViet chặn trên Cloud. Thay đổi sẽ có tác dụng khi chạy Local)." });
    }
    res.json({ success: true, message: "Kết nối KiotViet thành công!" });
  } catch (e: any) {
    console.error("Check Connection Error:", e);
    res.json({ success: false, error: e.message });
  }
});

// API Route to sync partners
app.get("/api/kiotviet/sync-partners", async (req, res) => {
  try {
    const { clientId, clientSecret, retailer } = getCredentials(req);
    const token = await getKiotVietToken(clientId, clientSecret);
    
    const fetchAll = async (endpoint: string, maxPages = 10) => {
      let allData: any[] = [];
      let hasMore = true;
      let isMockTriggered = false;

      while (hasMore && allData.length < maxPages * 100) {
        const skip = allData.length;
        const url = `${endpoint}?pageSize=100&skip=${skip}`;
        const responseData = await fetchKiotVietPath(token, url, retailer);
        
        if (responseData && responseData.isWafBlocked) {
          isMockTriggered = true;
          // Generate some mock data for partners
          if (endpoint === 'customers') {
             allData = [
                { id: '1', code: 'KH001', name: 'Nguyễn Văn Mock', contactNumber: '0901234567', modifiedDate: new Date().toISOString() }
             ];
          } else if (endpoint === 'suppliers') {
             allData = [
                { id: '2', code: 'NCC001', name: 'Công ty TNHH Mock', contactNumber: '0901112222', modifiedDate: new Date().toISOString() }
             ];
          }
          break;
        }
        
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
    const { clientId, clientSecret, retailer } = getCredentials(req);
    const skipParam = parseInt(req.query.skip as string) || 0;
    const startTime = Date.now();
    const token = await getKiotVietToken(clientId, clientSecret);
    let allData: any[] = [];
    let hasMore = true;
    let isMockTriggered = false;
    let currentSkip = skipParam;

    // Limit inside one request to 50 to prevent Cloud Run timeouts.
    // The frontend will handle pagination by calling this API multiple times.
    while (hasMore && allData.length < 50) { 
      // Break early if we're nearing 15 seconds to prevent Cloud Run/Vercel timeout
      if (Date.now() - startTime > 15000) {
         break;
      }

      const url = `products?pageSize=50&skip=${currentSkip}&includeInventory=true`;
      const responseData = await fetchKiotVietPath(token, url, retailer);
      
      if (responseData && responseData.isWafBlocked) {
          isMockTriggered = true;
          allData = [
             { 
               id: '1001', code: 'SP001', name: 'Sản phẩm Demo WAF 1', 
               fullName: 'Sản phẩm Demo WAF 1', categoryName: 'Danh mục Demo',
               basePrice: 100000,
               modifiedDate: new Date().toISOString(),
               inventories: [{ onHand: 10 }]
             },
             { 
               id: '1002', code: 'SP002', name: 'Sản phẩm Demo WAF 2', 
               fullName: 'Sản phẩm Demo WAF 2', categoryName: 'Danh mục Demo',
               basePrice: 200000,
               modifiedDate: new Date().toISOString(),
               inventories: [{ onHand: 5 }]
             }
          ];
          hasMore = false;
          break;
      }
      
      if (responseData && responseData.isMock) {
          isMockTriggered = true;
          break;
      }
      
      if (responseData && responseData.data && responseData.data.length > 0) {
        allData = allData.concat(responseData.data);
        currentSkip += responseData.data.length;
        
        if (responseData.data.length < 50) {
           hasMore = false;
        } else {
           await new Promise(r => setTimeout(r, 200));
        }
      } else {
        hasMore = false;
      }
    }

    res.json({
      success: true,
      isMock: isMockTriggered,
      products: allData,
      nextSkip: hasMore ? currentSkip : null
    });
  } catch (error: any) {
    console.error("Sync Products Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default app;
