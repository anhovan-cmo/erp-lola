const http = require('http');
http.get('http://localhost:3000/api/kiotviet/sync-products?skip=0', (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      console.log('body length:', rawData.length);
      console.log('first 100 chars:', rawData.substring(0, 100));
      const parsedData = JSON.parse(rawData);
      console.log('parsed successfully, isMock:', parsedData.isMock);
    } catch (e) {
      console.error('parse error:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('http error:', e);
});
