const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkCors() {
  const targetUrl = 'https://public.api.kiotviet.vn/customers?pageSize=1';
  try {
    const res = await fetch(targetUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Retailer'
      }
    });

    console.log("Status:", res.status);
    console.log("Headers:");
    res.headers.forEach((val, key) => console.log(key, ':', val));
    
  } catch (e) {
    console.log("Fetch Error:", e);
  }
}

checkCors();
