const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const KIOTVIET_CLIENT_ID = "dbae08de-7391-412d-b2f3-bdffc06f1f5a";
const KIOTVIET_CLIENT_SECRET = "837AB25327544A21C9143381DFD33AC7C3668E97";
const KIOTVIET_RETAILER = "fugalo";

async function test() {
  const params = new URLSearchParams();
  params.append("client_id", KIOTVIET_CLIENT_ID);
  params.append("client_secret", KIOTVIET_CLIENT_SECRET);
  params.append("grant_type", "client_credentials");
  params.append("scopes", "PublicApi.Access");

  console.log("Getting token...");
  const tokenRes = await fetch("https://id.kiotviet.vn/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;
  console.log('Got token:', !!token);

  console.log("Fetching customers...");
  const custRes = await fetch(`https://public.api.kiotviet.vn/customers?pageSize=1`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Retailer": KIOTVIET_RETAILER,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9,vi;q=0.8"
    }
  });
  
  if (custRes.ok) {
     const data = await custRes.json();
     console.log("Customer keys:", Object.keys(data.data[0]));
     console.log("Debt field:", data.data[0].debt);
  } else {
     console.log("Customer fetch failed:", custRes.status);
  }
}

test();
