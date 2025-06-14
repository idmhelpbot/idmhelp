const express = require('express');
const path = require('path');
const fs = require('fs');
const { generateBarcodeImage } = require('./barcodeGenerator');

const app = express();
const PORT = 3000;
const PAGE_SIZE = 10;

app.use(express.static('public'));

const headers = {
  'User-Agent': 'Mozilla/5.0',
  'Accept': 'application/json, text/plain, */*',
  'Content-Type': 'application/json',
  'Origin': 'https://www.klikindomaret.com',
  'Referer': 'https://www.klikindomaret.com/',
};

function formatPrice(price) {
  return `Rp${price.toLocaleString()}`;
}

// ✅ Route pencarian produk
app.get('/search', async (req, res) => {
  const keyword = req.query.q || '';
  const page = parseInt(req.query.page) || 0;

  const url = new URL('https://ap-mc.klikindomaret.com/assets-klikidmsearch/api/get/catalog-xpress/api/webapp/search/result');
  url.search = new URLSearchParams({
    keyword,
    type: 'keyword',
    page,
    size: PAGE_SIZE,
    storeCode: 'TJKT',
    latitude: '-6.1763897',
    longitude: '106.82667',
    mode: 'DELIVERY',
    districtId: '141100100',
    isUserFiltered: 'false',
  }).toString();

  try {
    const response = await fetch(url, { headers });
    const data = await response.json();
    const content = data.data?.content || [];

    const items = content.map(p => ({
      name: p.productName,
      price: formatPrice(p.price),
      finalPrice: p.finalPrice ? formatPrice(p.finalPrice) : null,
      plu: p.plu,
      image: p.imageUrl,
    }));

    res.json({ items, nextPage: items.length === PAGE_SIZE ? page + 1 : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ Route barcode image
app.get('/barcode/:plu', async (req, res) => {
  const plu = req.params.plu;
  try {
    const { buffer } = await generateBarcodeImage(plu);
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (e) {
    console.error('Barcode error:', e.message);
    res.status(404).send(`❌ Barcode tidak ditemukan untuk PLU ${plu}`);
  }
});

// ✅ Route barcode-mapping gabungan dari dua file
app.get('/barcode-mapping', (req, res) => {
 const dataFiles = [
  path.join(__dirname, 'data', 'barcodesheet.json'),
  path.join(__dirname, 'data', 'plucode.json'),
];


  const seen = new Set();
  const combined = [];

  for (const file of dataFiles) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const json = JSON.parse(content);
        json.forEach(entry => {
          if (entry.barcode && entry.plu && !seen.has(entry.barcode)) {
            seen.add(entry.barcode);
            combined.push(entry);
          }
        });
      } catch (e) {
        console.error(`Gagal baca file: ${file}`, e.message);
      }
    }
  }

  res.json(combined);
});

// Mulai server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
