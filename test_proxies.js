const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testProxy(proxyUrl) {
  try {
    console.log("Testing:", proxyUrl);
    const res = await fetch(proxyUrl);
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response text length:", text.length, "Snippet:", text.substring(0, 50));
  } catch (e) {
    console.log("Error:", e.message);
  }
}

async function test() {
  const targetUrl = 'https://id.kiotviet.vn/connect/token';
  await testProxy(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
  
  const targetUrl2 = 'https://public.api.kiotviet.vn/customers?pageSize=1';
  await testProxy(`https://corsproxy.io/?${encodeURIComponent(targetUrl2)}`);
}

test();
