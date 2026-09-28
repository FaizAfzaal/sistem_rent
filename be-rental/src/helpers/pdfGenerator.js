const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const ensureDirectoryExists = (filePath) => {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) return true;
  fs.mkdirSync(dirname, { recursive: true });
};

const base64ToBuffer = (base64Str) => {
  if (!base64Str) return null;
  try {
    const cleanStr = base64Str.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(cleanStr, 'base64');
  } catch (e) {
    return null;
  }
};

/**
 * Generate PDF Serah Terima Barang Keluar
 */
const generateOutgoingPDF = (data, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      ensureDirectoryExists(outputPath);
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const navyColor = '#0F172A';
      const indigoColor = '#4F46E5';
      const lightBgColor = '#F8FAFC';
      const borderGray = '#CBD5E1';
      const textColor = '#334155';

      // Header Banner
      doc.rect(40, 40, 515, 60).fill(navyColor);
      doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text('RentalHub', 55, 52);
      doc.fillColor('#94A3B8').fontSize(9).font('Helvetica').text('Sistem Rental Alat Berat Online', 55, 73);

      doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('BERITA ACARA SERAH TERIMA', 300, 52, { align: 'right', width: 240 });
      doc.fillColor('#A5B4FC').fontSize(9).font('Helvetica').text('DOKUMEN BARANG KELUAR', 300, 72, { align: 'right', width: 240 });

      let y = 115;

      // Info Box (No. Dokumen & Tanggal)
      doc.rect(40, y, 515, 30).fill(lightBgColor).stroke(borderGray);
      doc.fillColor(textColor).fontSize(9).font('Helvetica-Bold').text('No. Dokumen: ', 50, y + 9);
      doc.font('Helvetica').text(data.document_number || '-', 120, y + 9);

      doc.font('Helvetica-Bold').text('Tanggal Dibuat: ', 330, y + 9);
      doc.font('Helvetica').text(data.created_date || new Date().toLocaleDateString('id-ID'), 410, y + 9);

      y += 42;

      // Section 1: Data Rental & Penyewa
      doc.rect(40, y, 515, 20).fill(indigoColor);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text('1. DATA TRANSAKSI & PENYEWA', 48, y + 5);
      y += 26;

      const drawRow = (label, val, xPos, yPos, labelW = 120) => {
        doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text(label, xPos, yPos);
        doc.fillColor(navyColor).fontSize(9).font('Helvetica').text(`: ${val || '-'}`, xPos + labelW, yPos);
      };

      drawRow('No. Transaksi', data.kode_booking, 45, y);
      drawRow('Nama Penyewa', data.customer_name, 300, y);
      y += 16;
      drawRow('Nomor HP', data.customer_phone, 45, y);
      drawRow('Email', data.customer_email, 300, y);
      y += 16;
      drawRow('Alamat Penyewa', data.customer_address, 45, y, 120);
      y += 24;

      // Section 2: Detail Alat Berat & Periode Rental
      doc.rect(40, y, 515, 20).fill(indigoColor);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text('2. DETAIL ALAT BERAT & PERIODE RENTAL', 48, y + 5);
      y += 26;

      drawRow('Nama Alat Berat', data.nama_alat, 45, y);
      drawRow('Kode Alat', data.kode_alat, 300, y);
      y += 16;
      drawRow('Merk / Tipe', data.merk, 45, y);
      drawRow('Lama Sewa', `${data.lama_sewa || 1} Hari`, 300, y);
      y += 16;
      drawRow('Tgl & Jam Keluar', `${data.tanggal_keluar || '-'} (${data.jam_keluar || '08:00'} WIB)`, 45, y);
      drawRow('Jadwal Kembali', `${data.jadwal_pengembalian || '-'} (${data.jam_selesai || '17:00'} WIB)`, 300, y);
      y += 26;

      // Section 3: Kondisi Barang Sebelum Digunakan
      doc.rect(40, y, 515, 20).fill(indigoColor);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text('3. CHECKLIST KONDISI BARANG SEBELUM DIGUNAKAN', 48, y + 5);
      y += 26;

      const cond = data.condition || {};
      const checks = [
        { label: 'Kondisi Alat Baik', val: cond.kondisi_baik !== false },
        { label: 'Mesin Berfungsi Normal', val: cond.mesin_normal !== false },
        { label: 'Kelengkapan Alat Sesuai', val: cond.kelengkapan_sesuai !== false },
        { label: 'Dokumen Alat Lengkap', val: cond.dokumen_lengkap !== false },
        { label: 'Foto Dokumentasi Tersedia', val: cond.foto_tersedia !== false },
      ];

      checks.forEach((item, idx) => {
        const xPos = idx % 2 === 0 ? 45 : 300;
        const curY = y + Math.floor(idx / 2) * 18;
        const mark = item.val ? '[ V ] OK' : '[ X ] Tidak Sesuai';
        const color = item.val ? '#166534' : '#991B1B';
        doc.fillColor(textColor).fontSize(9).font('Helvetica').text(`• ${item.label}`, xPos, curY);
        doc.fillColor(color).font('Helvetica-Bold').text(mark, xPos + 150, curY);
      });
      y += Math.ceil(checks.length / 2) * 18 + 8;

      // Catatan
      doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('Catatan Kondisi Barang:', 45, y);
      y += 14;
      doc.rect(40, y, 515, 35).fill(lightBgColor).stroke(borderGray);
      doc.fillColor(navyColor).fontSize(8.5).font('Helvetica').text(data.catatan || 'Kondisi barang dalam keadaan baik dan laik pakai saat diserahterimakan.', 48, y + 6, { width: 500 });
      y += 45;

      // Pernyataan Serah Terima
      doc.fillColor(textColor).fontSize(8.5).font('Helvetica-Oblique').text(
        'Dengan ini menyatakan bahwa barang/alat berat di atas telah diperiksa dan diserahterimakan dalam kondisi sesuai dengan yang tercantum di dalam berita acara ini.',
        40, y, { width: 515, align: 'justify' }
      );
      y += 25;

      // Section 4: Tanda Tangan Digital
      doc.rect(40, y, 245, 120).stroke(borderGray);
      doc.rect(310, y, 245, 120).stroke(borderGray);

      doc.fillColor(navyColor).fontSize(9).font('Helvetica-Bold').text('Tanda Tangan Penyewa', 40, y + 8, { width: 245, align: 'center' });
      doc.fillColor(navyColor).fontSize(9).font('Helvetica-Bold').text('Tanda Tangan Admin Rental', 310, y + 8, { width: 245, align: 'center' });

      // Embed customer signature
      const custSigBuf = base64ToBuffer(data.customer_signature);
      if (custSigBuf) {
        try {
          doc.image(custSigBuf, 85, y + 25, { fit: [155, 60], align: 'center', valig: 'center' });
        } catch (e) {
          doc.fillColor('#94A3B8').fontSize(8).text('[Tanda Tangan Terlampir]', 40, y + 45, { width: 245, align: 'center' });
        }
      }

      // Embed admin signature
      const adminSigBuf = base64ToBuffer(data.admin_signature);
      if (adminSigBuf) {
        try {
          doc.image(adminSigBuf, 355, y + 25, { fit: [155, 60], align: 'center', valig: 'center' });
        } catch (e) {
          doc.fillColor('#94A3B8').fontSize(8).text('[Tanda Tangan Terlampir]', 310, y + 45, { width: 245, align: 'center' });
        }
      }

      doc.fillColor(navyColor).fontSize(9).font('Helvetica-Bold').text(`( ${data.customer_name || 'Penyewa'} )`, 40, y + 98, { width: 245, align: 'center' });
      doc.fillColor(navyColor).fontSize(9).font('Helvetica-Bold').text(`( ${data.admin_name || 'Admin Rental'} )`, 310, y + 98, { width: 245, align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate PDF Berita Acara Pengembalian Barang
 */
const generateReturnPDF = (data, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      ensureDirectoryExists(outputPath);
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const navyColor = '#0F172A';
      const purpleColor = '#6366F1';
      const lightBgColor = '#F8FAFC';
      const borderGray = '#CBD5E1';
      const textColor = '#334155';

      // Header Banner
      doc.rect(40, 40, 515, 60).fill(navyColor);
      doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold').text('RentalHub', 55, 52);
      doc.fillColor('#94A3B8').fontSize(9).font('Helvetica').text('Sistem Rental Alat Berat Online', 55, 73);

      doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold').text('BERITA ACARA PENGEMBALIAN', 280, 52, { align: 'right', width: 260 });
      doc.fillColor('#A5B4FC').fontSize(9).font('Helvetica').text('DOKUMEN BARANG KEMBALI', 280, 72, { align: 'right', width: 260 });

      let y = 115;

      // Info Box (No. Dokumen & Tanggal)
      doc.rect(40, y, 515, 30).fill(lightBgColor).stroke(borderGray);
      doc.fillColor(textColor).fontSize(9).font('Helvetica-Bold').text('No. Dokumen: ', 50, y + 9);
      doc.font('Helvetica').text(data.document_number || '-', 120, y + 9);

      doc.font('Helvetica-Bold').text('Tanggal Pengembalian: ', 330, y + 9);
      doc.font('Helvetica').text(data.created_date || new Date().toLocaleDateString('id-ID'), 440, y + 9);

      y += 42;

      // Section 1: Data Rental & Penyewa
      doc.rect(40, y, 515, 20).fill(purpleColor);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text('1. DATA TRANSAKSI & PENYEWA', 48, y + 5);
      y += 26;

      const drawRow = (label, val, xPos, yPos, labelW = 120) => {
        doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text(label, xPos, yPos);
        doc.fillColor(navyColor).fontSize(9).font('Helvetica').text(`: ${val || '-'}`, xPos + labelW, yPos);
      };

      drawRow('No. Transaksi', data.kode_booking, 45, y);
      drawRow('Nama Penyewa', data.customer_name, 300, y);
      y += 16;
      drawRow('Nomor HP', data.customer_phone, 45, y);
      drawRow('Nama Alat Berat', data.nama_alat, 300, y);
      y += 16;
      drawRow('Kode Alat', data.kode_alat, 45, y);
      drawRow('Tanggal Keluar', data.tanggal_keluar, 300, y);
      y += 24;

      // Section 2: Jadwal Kontrak & Waktu Pengembalian Aktual
      doc.rect(40, y, 515, 20).fill(purpleColor);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text('2. WAKTU PENGEMBALIAN & SELISIH KONTRAK', 48, y + 5);
      y += 26;

      drawRow('Jadwal Kembali Kontrak', data.jadwal_kembali_kontrak, 45, y, 140);
      drawRow('Waktu Kembali Aktual', data.waktu_kembali_aktual, 300, y, 130);
      y += 16;

      doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('Selisih Pengembalian', 45, y);
      const selisihStatus = data.selisih_hari || 'Sesuai Jadwal Kontrak';
      const isLate = selisihStatus.toLowerCase().includes('terlambat');
      const selisihColor = isLate ? '#991B1B' : '#166534';
      doc.fillColor(selisihColor).fontSize(9).font('Helvetica-Bold').text(`: ${selisihStatus}`, 185, y);
      y += 24;

      // Section 3: Hasil Pemeriksaan Barang Saat Kembali
      doc.rect(40, y, 515, 20).fill(purpleColor);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text('3. HASIL PEMERIKSAAN KONDISI BARANG', 48, y + 5);
      y += 26;

      const check = data.checklists || {};
      const items = [
        { label: 'Alat Kembali Sesuai Transaksi', val: check.alat_sesuai !== false },
        { label: 'Mesin Berfungsi Normal', val: check.mesin_normal !== false },
        { label: 'Tidak Ada Kerusakan', val: check.tidak_rusak !== false },
        { label: 'Kelengkapan Alat Lengkap', val: check.kelengkapan_lengkap !== false },
        { label: 'Kondisi Sesuai Saat Keluar', val: check.kondisi_sesuai !== false },
      ];

      items.forEach((item, idx) => {
        const xPos = idx % 2 === 0 ? 45 : 300;
        const curY = y + Math.floor(idx / 2) * 18;
        const mark = item.val ? '[ V ] Sesuai / Normal' : '[ X ] Ada Catatan';
        const color = item.val ? '#166534' : '#D97706';
        doc.fillColor(textColor).fontSize(9).font('Helvetica').text(`• ${item.label}`, xPos, curY);
        doc.fillColor(color).font('Helvetica-Bold').text(mark, xPos + 150, curY);
      });
      y += Math.ceil(items.length / 2) * 18 + 8;

      // Catatan Admin
      doc.fillColor('#64748B').fontSize(9).font('Helvetica-Bold').text('Catatan Pemeriksaan Admin:', 45, y);
      y += 14;
      doc.rect(40, y, 515, 35).fill(lightBgColor).stroke(borderGray);
      doc.fillColor(navyColor).fontSize(8.5).font('Helvetica').text(data.catatan_admin || 'Alat berat telah diterima kembali oleh admin penerima dan diperiksa seluruh fungsi teknisnya.', 48, y + 6, { width: 500 });
      y += 45;

      // Pernyataan Pengembalian
      doc.fillColor(textColor).fontSize(8.5).font('Helvetica-Oblique').text(
        'Demikian berita acara pengembalian alat berat ini dibuat dengan sebenar-benarnya dan ditandatangani oleh kedua belah pihak sebagai bukti sah transaksi pengembalian.',
        40, y, { width: 515, align: 'justify' }
      );
      y += 25;

      // Section 4: Tanda Tangan Digital
      doc.rect(40, y, 245, 115).stroke(borderGray);
      doc.rect(310, y, 245, 115).stroke(borderGray);

      doc.fillColor(navyColor).fontSize(9).font('Helvetica-Bold').text('Tanda Tangan Penyewa', 40, y + 8, { width: 245, align: 'center' });
      doc.fillColor(navyColor).fontSize(9).font('Helvetica-Bold').text('Tanda Tangan Admin Penerima', 310, y + 8, { width: 245, align: 'center' });

      // Embed customer signature
      const custSigBuf = base64ToBuffer(data.customer_signature);
      if (custSigBuf) {
        try {
          doc.image(custSigBuf, 85, y + 25, { fit: [155, 55], align: 'center', valig: 'center' });
        } catch (e) {
          doc.fillColor('#94A3B8').fontSize(8).text('[Tanda Tangan Terlampir]', 40, y + 45, { width: 245, align: 'center' });
        }
      }

      // Embed admin signature
      const adminSigBuf = base64ToBuffer(data.admin_signature);
      if (adminSigBuf) {
        try {
          doc.image(adminSigBuf, 355, y + 25, { fit: [155, 55], align: 'center', valig: 'center' });
        } catch (e) {
          doc.fillColor('#94A3B8').fontSize(8).text('[Tanda Tangan Terlampir]', 310, y + 45, { width: 245, align: 'center' });
        }
      }

      doc.fillColor(navyColor).fontSize(9).font('Helvetica-Bold').text(`( ${data.customer_name || 'Penyewa'} )`, 40, y + 95, { width: 245, align: 'center' });
      doc.fillColor(navyColor).fontSize(9).font('Helvetica-Bold').text(`( ${data.admin_name || 'Admin Penerima'} )`, 310, y + 95, { width: 245, align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateOutgoingPDF,
  generateReturnPDF,
};
