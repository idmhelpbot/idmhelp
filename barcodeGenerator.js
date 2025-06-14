const bwipjs = require('bwip-js');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

// 🔧 Path ke file data JSON
const dataFiles = [
  path.join(__dirname, 'data', 'barcodesheet.json'),
  path.join(__dirname, 'data', 'plucode.json'),
];

/**
 * Generate barcode image buffer dari PLU
 * @param {string} plu - PLU yang dimasukkan user
 * @returns {Promise<Buffer>} - Buffer PNG dari barcode
 */
async function generateBarcodeImage(plu) {
  const key = plu.trim();
  const pluToBarcode = {};
  const pluToOriginal = {};

  dataFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      data.forEach(item => {
        const cleanPlu = String(item.plu).trim();
        pluToBarcode[cleanPlu] = String(item.barcode).trim();
        pluToOriginal[cleanPlu.replace(/\D/g, '')] = cleanPlu;
      });
    }
  });

  const barcode = pluToBarcode[key];
  if (!barcode) {
    throw new Error(`Barcode tidak ditemukan untuk PLU: ${key}`);
  }

  const pluAsli = pluToOriginal[key] || key;

  try {
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: barcode,
      scale: 5,
      height: 10,
      includetext: true,
      textxalign: 'center',
      paddingwidth: 5,
      paddingheight: 5,
      backgroundcolor: 'FFFFFF',
    });
    return { buffer: png, pluAsli };
  } catch (err) {
    throw new Error('Gagal membuat barcode: ' + err.message);
  }
}

/**
 * Tambahkan info ke gambar barcode: nama besar, info sedang, dan link bawah.
 * @param {Buffer} buffer - Gambar barcode
 * @param {Object} metadata - { nama, rak, slv, baris, plu, status }
 * @returns {Promise<Buffer>} - Buffer PNG
 */
async function addInfoToBarcodeImage(buffer, metadata = {}) {
  const image = await Jimp.read(buffer);
  const fontLarge = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

  const nama = metadata.nama || '-';
  const rak = metadata.rak || '-';
  const slv = metadata.slv || '-';
  const baris = metadata.baris || '-';
  const plu = metadata.plu || '-';
  const status = metadata.status || '-';

  const textLine1 = nama;
  const textLine2 = `Rak: ${rak} | Slv: ${slv} | Baris: ${baris}`;
  const textLine3 = `PLU: ${plu}`;
  const textLine4 = `Status: ${status}`;
  const linkLine = 't.me/idm_help_bot';

  const topHeight = 110;
  const bottomHeight = 40;
  const finalHeight = image.bitmap.height + topHeight + bottomHeight;

  const finalImage = new Jimp(image.bitmap.width, finalHeight, 0xFFFFFFFF);

  finalImage.print(fontLarge, 0, 5, {
    text: textLine1,
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
  }, finalImage.bitmap.width);

  finalImage.print(fontMedium, 0, 45, {
    text: textLine2,
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
  }, finalImage.bitmap.width);

  finalImage.print(fontMedium, 0, 65, {
    text: textLine4,
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
  }, finalImage.bitmap.width);

  finalImage.print(fontMedium, 0, 85, {
    text: textLine3,
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
  }, finalImage.bitmap.width);

  finalImage.composite(image, 0, topHeight);

  finalImage.print(fontMedium, 0, finalHeight - 30, {
    text: linkLine,
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
  }, finalImage.bitmap.width);

  return await finalImage.getBufferAsync(Jimp.MIME_PNG);
}

module.exports = {
  generateBarcodeImage,
  addInfoToBarcodeImage
};
