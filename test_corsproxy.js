const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function getClientToken() {
    const params = new URLSearchParams();
    params.append("client_id", "dbae08de-7391-412d-b2f3-bdffc06f1f5a");
    params.append("client_secret", "837AB25327544A21C9143381DFD33AC7C3668E97");
    params.append("grant_type", "client_credentials");
    params.append("scopes", "PublicApi.Access");

    const tokenRes = await fetch("https://id.kiotviet.vn/connect/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    });
    const d = await tokenRes.json();
    return d.access_token;
}

async function test() {
    const token = await getClientToken();
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Retailer": "fugalo",
      "Origin": "http://localhost:3000",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Referer": "http://localhost:3000/"
    };

    const targetUrl = 'https://public.api.kiotviet.vn/customers?pageSize=1';
    
    console.log("Fetching from corsproxy.io...");
    const url = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    
    const res = await fetch(url, { headers });
    console.log("Status:", res.status);
    console.log("Response:", await res.text().then(t => t.substring(0,200)));
}

test();
