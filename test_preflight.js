const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testCors() {
    const targetUrl = 'https://public.api.kiotviet.vn/customers?pageSize=1';
    
    console.log("Fetching OPTIONS...");
    const res = await fetch(targetUrl, {
        method: "OPTIONS",
        headers: {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization, Retailer",
            "User-Agent": "Mozilla/5.0"
        }
    });

    console.log("Status:", res.status);
    console.log("Response headers:");
    res.headers.forEach((val, key) => console.log(key, val));
    console.log(await res.text());
}

testCors();
