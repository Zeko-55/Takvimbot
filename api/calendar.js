// Vercel Serverless Function — /api/calendar
// Kullanım: /api/calendar?month=eylul&year=2026
// takvim.ru'daki hazır PDF'i olduğu gibi proxy'leyerek döndürür.

// İzin verilen 12 ay adı (takvim.ru'nun URL formatıyla)
const ALLOWED_MONTHS = [
  "ocak", "subat", "mart", "nisan", "mayis", "haziran",
  "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"
];

// Makul yıl aralığı (sadece sayısal, geçerli takvim yılları)
const MIN_YEAR = 2020;
const MAX_YEAR = 2040;

// takvim.ru'nun kullandığı sabit upload dizini
const BASE_URL = "https://takvim.ru/wp-content/uploads/2021/03";

export default async function handler(req, res) {
  // Sadece GET
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Sadece GET isteğine izin verilir." });
  }

  const { month, year } = req.query || {};

  // --- Güvenlik: month doğrulama ---
  if (typeof month !== "string" || !ALLOWED_MONTHS.includes(month)) {
    return res.status(400).json({ error: "Geçersiz 'month' parametresi. İzin verilen ay adlarından birini kullanın." });
  }

  // --- Güvenlik: year doğrulama ---
  const yearNum = Number(year);
  if (!Number.isInteger(yearNum) || yearNum < MIN_YEAR || yearNum > MAX_YEAR) {
    return res.status(400).json({ error: "Geçersiz 'year' parametresi. Makul bir yıl girilmelidir." });
  }

  // --- takvim.ru PDF URL'sini oluştur ---
  const pdfUrl = `${BASE_URL}/notlar-icin-${month}-${yearNum}-takvimi.pdf`;

  try {
    // Server-side fetch
    const upstream = await fetch(pdfUrl, {
      method: "GET",
      redirect: "follow"
    });

    if (!upstream.ok) {
      return res.status(404).json({ error: "Bu ay için takvim.ru üzerinde takvim bulunamadı." });
    }

    // PDF içeriğini buffer olarak oku
    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // PDF'i olduğu gibi, doğru header ile döndür
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600"); // 1 saat önbellek
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(buffer);

  } catch (err) {
    // Ağ hatası vb.
    return res.status(502).json({ error: "takvim.ru adresine ulaşılamadı. Lütfen daha sonra tekrar deneyin." });
  }
}