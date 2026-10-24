// Hesaplamalar

const GUN_ADLARI = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const KISA_GUN_ADLARI = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const EN_FAZLA_KAYIT_DAKIKASI = 1440; // 24 saat
const EN_FAZLA_KAYIT_SANIYESI = 86400;

// ---------- Tarih ----------

function tarihiMetneCevir(tarih) {
  const yil = tarih.getFullYear();
  const ay = String(tarih.getMonth() + 1).padStart(2, "0");
  const gun = String(tarih.getDate()).padStart(2, "0");
  return yil + "-" + ay + "-" + gun;
}

function bugunMetni() {
  return tarihiMetneCevir(new Date());
}

function metniTariheCevir(metin) {
  const parcalar = metin.split("-");
  return new Date(Number(parcalar[0]), Number(parcalar[1]) - 1, Number(parcalar[2]));
}

function tarihMetniGecerliMi(metin) {
  if (typeof metin !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metin)) return false;
  return tarihiMetneCevir(metniTariheCevir(metin)) === metin;
}

// iki günü karşılaştırmak için gün numarası 
function gunNumarasi(metin) {
  const parcalar = metin.split("-");
  const ms = Date.UTC(Number(parcalar[0]), Number(parcalar[1]) - 1, Number(parcalar[2]));
  return Math.round(ms / 86400000);
}

function gunEkle(metin, gunSayisi) {
  const tarih = metniTariheCevir(metin);
  tarih.setDate(tarih.getDate() + gunSayisi);
  return tarihiMetneCevir(tarih);
}

// pazartesi = 0, pazar = 6 
function haftaninGunIndeksi(metin) {
  const gun = metniTariheCevir(metin).getDay();
  return (gun + 6) % 7;
}

function haftaBasi(metin) {
  return gunEkle(metin, -haftaninGunIndeksi(metin));
}

// dakika alır, "1 sa 5 dk" gibi yazı verir
function sureMetni(dakika) {
  const toplamSaniye = Math.max(0, Math.round(Number(dakika) * 60));
  const saat = Math.floor(toplamSaniye / 3600);
  const dk = Math.floor((toplamSaniye % 3600) / 60);
  const sn = toplamSaniye % 60;

  if (toplamSaniye === 0) return "0 dk";
  if (toplamSaniye < 60) return sn + " sn";

  let metin = "";
  if (saat > 0) metin += saat + " sa";
  if (dk > 0) metin += (metin ? " " : "") + dk + " dk";
  if (sn > 0) metin += (metin ? " " : "") + sn + " sn";
  return metin;
}

// ---------- Kayıt süreleri ----------

function tamSayiMi(x) {
  return typeof x === "number" && Number.isInteger(x);
}

function kayitSaniyesi(kayit) {
  if (tamSayiMi(kayit.saniye)) return kayit.saniye;
  return kayit.dakika * 60;
}

function kayitDakikasi(kayit) {
  return kayitSaniyesi(kayit) / 60;
}

function kayitlarinToplami(kayitlar) {
  let saniye = 0;
  for (let i = 0; i < kayitlar.length; i++) {
    saniye += kayitSaniyesi(kayitlar[i]);
  }
  return saniye / 60;
}

// ---------- Dersler ----------

function dersAdiniDuzelt(ad) {
  return String(ad).replace(/\s+/g, " ").trim();
}

// harf hassasiyeti
function dersAnahtari(ad) {
  return dersAdiniDuzelt(ad).toLocaleLowerCase("tr");
}

function dersAdiKullanimda(dersler, ad, haricId) {
  const anahtar = dersAnahtari(ad);
  for (let i = 0; i < dersler.length; i++) {
    if (dersler[i].id !== haricId && dersAnahtari(dersler[i].ad) === anahtar) return true;
  }
  return false;
}

function yeniKimlik() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Toplamlar ----------

function gunlukToplam(calismalar, tarih, dersId) {
  let saniye = 0;
  for (let i = 0; i < calismalar.length; i++) {
    const c = calismalar[i];
    if (c.tarih !== tarih) continue;
    if (dersId !== undefined && c.dersId !== dersId) continue;
    saniye += kayitSaniyesi(c);
  }
  return saniye / 60;
}

function gunlereGoreToplamlar(calismalar) {
  const saniyeler = {};
  for (let i = 0; i < calismalar.length; i++) {
    const c = calismalar[i];
    saniyeler[c.tarih] = (saniyeler[c.tarih] || 0) + kayitSaniyesi(c);
  }
  const sonuc = {};
  for (const tarih in saniyeler) sonuc[tarih] = saniyeler[tarih] / 60;
  return sonuc;
}

// { dersId: dakika }
function dersToplamlari(calismalar) {
  const saniyeler = {};
  for (let i = 0; i < calismalar.length; i++) {
    const c = calismalar[i];
    saniyeler[c.dersId] = (saniyeler[c.dersId] || 0) + kayitSaniyesi(c);
  }
  const sonuc = {};
  for (const id in saniyeler) sonuc[id] = saniyeler[id] / 60;
  return sonuc;
}

// ---------- Seri ----------

// (Not: geçmiş günler de şu anki günlük hedefe göre bakılıyor)

function seriHesapla(calismalar, gunlukHedef, bugun) {
  if (!(gunlukHedef > 0)) return { mevcut: 0, enUzun: 0 };

  // hedefe ulaşılan günlerin numaraları
  const toplamlar = gunlereGoreToplamlar(calismalar);
  const gunler = [];
  for (const tarih in toplamlar) {
    if (toplamlar[tarih] >= gunlukHedef) gunler.push(gunNumarasi(tarih));
  }
  gunler.sort(function (a, b) { return a - b; });

  // her gün için "o güne kadar kaç gün üst üste" bilgisini tutuluyor
  const kosular = {};
  let enUzun = 0;
  let kosu = 0;
  for (let i = 0; i < gunler.length; i++) {
    if (i > 0 && gunler[i] === gunler[i - 1] + 1) kosu++;
    else kosu = 1;
    kosular[gunler[i]] = kosu;
    if (kosu > enUzun) enUzun = kosu;
  }

  // bugün henüz bitmediyse seri bozulmaz, dünden devam eder
  const bugunNo = gunNumarasi(bugun);
  let mevcut = 0;
  if (kosular[bugunNo]) mevcut = kosular[bugunNo];
  else if (kosular[bugunNo - 1]) mevcut = kosular[bugunNo - 1];

  return { mevcut: mevcut, enUzun: enUzun };
}

function ilerlemeDurumu(toplam, hedef) {
  if (!(hedef > 0)) {
    return { tur: "hedefYok", oran: 0, mesaj: "Günlük bir hedef belirleyerek başlayabilirsin." };
  }
  const oran = toplam / hedef;
  if (oran >= 1) return { tur: "tamam", oran: oran, mesaj: "Bugünkü hedefini tamamladın! Harikasın! 🎉" };
  if (toplam > 0 && oran >= 0.7) return { tur: "yaklasti", oran: oran, mesaj: "Hedefine çok az kaldı, devam et! 💪" };
  if (toplam > 0) return { tur: "baslangic", oran: oran, mesaj: "Güzel başlangıç! Çalışmaya devam et. 📚" };
  return { tur: "baslamadi", oran: oran, mesaj: "Haydi, ilk çalışma kaydını ekle! 🚀" };
}

function seriRozeti(seri) {
  if (seri >= 30) return "Efsane! 30 günlük seri!";
  if (seri >= 7) return "Bir haftalık seri! Harikasın!";
  if (seri >= 3) return "Güzel gidiyorsun!";
  return "";
}

// ---------- Haftalık rapor ----------

function haftaRaporu(calismalar, haftaBaslangici) {
  const baslangicNo = gunNumarasi(haftaBaslangici);
  const gunlukSaniye = [0, 0, 0, 0, 0, 0, 0];
  let kayitSayisi = 0;

  for (let i = 0; i < calismalar.length; i++) {
    const fark = gunNumarasi(calismalar[i].tarih) - baslangicNo;
    if (fark >= 0 && fark <= 6) {
      gunlukSaniye[fark] += kayitSaniyesi(calismalar[i]);
      kayitSayisi++;
    }
  }

  const gunluk = [];
  let toplamSaniye = 0;
  for (let i = 0; i < 7; i++) {
    gunluk.push(gunlukSaniye[i] / 60);
    toplamSaniye += gunlukSaniye[i];
  }
  return { baslangic: haftaBaslangici, gunluk: gunluk, toplam: toplamSaniye / 60, kayitSayisi: kayitSayisi };
}

function haftaKarsilastirmaMesaji(buHafta, gecenHafta) {

  const fark = Math.round(buHafta * 60 - gecenHafta * 60) / 60;

  if (buHafta === 0 && gecenHafta === 0) return "Son iki haftada çalışma kaydın yok.";
  if (buHafta === 0) return "Bu hafta henüz çalışma kaydın yok.";
  if (gecenHafta === 0) return "Geçen hafta kaydın yok, bu hafta çalışmaya başlamışsın!";
  if (fark > 0) return "Bu hafta geçen haftadan " + sureMetni(fark) + " daha fazla çalıştın.";
  if (fark < 0) return "Bu hafta geçen haftadan " + sureMetni(-fark) + " daha az çalıştın.";
  return "Bu hafta geçen haftayla aynı miktarda çalıştın.";
}

// ---------- Karşılama ----------

// kullanıcı sadece adını yazıyor 
function karsilamaMetni(ad, tema) {
  const isim = String(ad || "").trim();
  let metin = isim ? "Hoş geldin, " + isim : "Hoş geldin";
  if (tema && tema.karsilamaEmojisi) metin += " " + tema.karsilamaEmojisi;
  return metin;
}

// ---------- Veri kontrolü (yedekten yüklerken ve bozuk veri için) ----------

function varsayilanVeri(tema) {
  tema = tema || {};
  return {
    surum: 1,
    ayarlar: { ad: tema.varsayilanAd || "", gunlukHedef: 0 },
    dersler: [],
    calismalar: []
  };
}

// Gelen veriyi temizler, geçersiz kayıtları atar. Hiç kullanılamıyorsa null döner.
function veriyiDogrula(ham, tema) {
  if (!ham || typeof ham !== "object" || Array.isArray(ham)) return null;

  const veri = varsayilanVeri(tema);
  let atilan = 0;

  // ayarlar
  const ayar = ham.ayarlar && typeof ham.ayarlar === "object" ? ham.ayarlar : {};
  if (typeof ayar.ad === "string") veri.ayarlar.ad = ayar.ad.trim().slice(0, 40);
  if (tamSayiMi(ayar.gunlukHedef) && ayar.gunlukHedef >= 0 && ayar.gunlukHedef <= 1440) {
    veri.ayarlar.gunlukHedef = ayar.gunlukHedef;
  }

  // dersler
  const hamDersler = Array.isArray(ham.dersler) ? ham.dersler : [];
  const dersKimlikleri = {};
  for (let i = 0; i < hamDersler.length; i++) {
    const d = hamDersler[i];
    if (!d || typeof d.id !== "string" || d.id === "" || typeof d.ad !== "string") { atilan++; continue; }
    const ad = dersAdiniDuzelt(d.ad).slice(0, 40);
    if (ad === "" || dersKimlikleri[d.id]) { atilan++; continue; }

    let hedef = 0;
    if (tamSayiMi(d.gunlukHedef) && d.gunlukHedef > 0 && d.gunlukHedef <= 1440) hedef = d.gunlukHedef;
    dersKimlikleri[d.id] = true;
    veri.dersler.push({ id: d.id, ad: ad, gunlukHedef: hedef });
  }

  // çalışma kayıtları
  const hamKayitlar = Array.isArray(ham.calismalar) ? ham.calismalar : [];
  const kayitKimlikleri = {};
  for (let i = 0; i < hamKayitlar.length; i++) {
    const c = hamKayitlar[i];
    if (!c || typeof c.id !== "string" || c.id === "" || kayitKimlikleri[c.id]) { atilan++; continue; }
    if (!dersKimlikleri[c.dersId] || !tarihMetniGecerliMi(c.tarih)) { atilan++; continue; }

    const saniyeTamam = tamSayiMi(c.saniye) && c.saniye >= 1 && c.saniye <= EN_FAZLA_KAYIT_SANIYESI;
    const dakikaTamam = tamSayiMi(c.dakika) && c.dakika >= 1 && c.dakika <= EN_FAZLA_KAYIT_DAKIKASI;
    if (!saniyeTamam && !dakikaTamam) { atilan++; continue; }

    kayitKimlikleri[c.id] = true;
    const yeni = { id: c.id, dersId: c.dersId, tarih: c.tarih };
    if (saniyeTamam) yeni.saniye = c.saniye;
    else yeni.dakika = c.dakika;
    veri.calismalar.push(yeni);
  }

  return { veri: veri, atilan: atilan };
}

const Mantik = {
  GUN_ADLARI, KISA_GUN_ADLARI, EN_FAZLA_KAYIT_DAKIKASI, EN_FAZLA_KAYIT_SANIYESI,
  tarihiMetneCevir, bugunMetni, metniTariheCevir, tarihMetniGecerliMi, gunNumarasi, gunEkle,
  haftaninGunIndeksi, haftaBasi, sureMetni, kayitSaniyesi, kayitDakikasi, kayitlarinToplami,
  dersAdiniDuzelt, dersAnahtari, dersAdiKullanimda, yeniKimlik,
  gunlukToplam, gunlereGoreToplamlar, dersToplamlari,
  seriHesapla, ilerlemeDurumu, seriRozeti,
  haftaRaporu, haftaKarsilastirmaMesaji,
  karsilamaMetni, varsayilanVeri, veriyiDogrula
};

// node testi için
if (typeof module !== "undefined") {
  module.exports = Mantik;
}
