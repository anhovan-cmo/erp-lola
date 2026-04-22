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

  const tokenRes = await fetch("https://id.kiotviet.vn/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;
  console.log('Got token:', !!token);

  // Attempt to fetch 1 customer
  const custRes = await fetch(`https://public.api.kiotviet.vn/customers?pageSize=1`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Retailer": KIOTVIET_RETAILER
    }
  });
  
  if (custRes.ok) {
     const data = await custRes.json();
     console.log("Customer data format:", JSON.stringify(data.data[0], null, 2));
  } else {
     console.log("Customer fetch failed:", custRes.status);
  }
}

test();
