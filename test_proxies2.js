const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function testProxy(url) {
  try {
    const res = await fetch(url);
    console.log("URL:", url, "->", res.status);
    if(res.status < 400 || res.status === 503) {
      console.log(await res.text().then(t => t.substring(0, 100)));
    }
  }catch(e){
    console.log("Error:", url, e.message);
  }
}

async function run() {
  const target = encodeURIComponent('https://public.api.kiotviet.vn/customers?pageSize=1');
  const proxies = [
     `https://api.codetabs.com/v1/proxy?quest=https://public.api.kiotviet.vn/customers?pageSize=1`,
     `https://thingproxy.freeboard.io/fetch/https://public.api.kiotviet.vn/customers?pageSize=1`
  ];
  for(const p of proxies) {
     await testProxy(p);
  }
}
run();
