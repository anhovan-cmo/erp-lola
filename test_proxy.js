const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  const url = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://public.api.kiotviet.vn/customers?pageSize=1')}`;
  console.log("Fetching from", url);
  const res = await fetch(url);
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Content:", text.substring(0, 300));
}

test();
