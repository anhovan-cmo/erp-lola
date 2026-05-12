fetch('http://localhost:3000/api/kiotviet/sync-products?skip=0', {
  headers: {
    'x-kv-client-id': 'dbae08de-7391-412d-b2f3-bdffc06f1f5a',
    'x-kv-client-secret': '837AB25327544A21C9143381DFD33AC7C3668E97',
    'x-kv-retailer': 'fugalo'
  }
}).then(async r => {
  console.log("STATUS:", r.status);
  const text = await r.text();
  console.log("BODY START:", text.substring(0, 100));
}).catch(e => console.error(e));
