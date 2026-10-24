// Çalıştırmak için: node test/mantik.test.js
const assert = require("node:assert/strict");
const M = require("../js/mantik.js");

let gecen = 0;
function test(ad, f) {
  try { f(); gecen++; console.log("  ✓", ad); }
  catch (e) { console.error("  ✗", ad, "\n   ", e.message); process.exitCode = 1; }
}
const c = (tarih, dakika, dersId = "a", id = Math.random().toString(36)) => ({ id, dersId, dakika, tarih });

console.log("Tarih");
test("tarihiMetneCevir yerel tarihi verir (UTC kayması yok)", () => {
  assert.equal(M.tarihiMetneCevir(new Date(2026, 9, 22, 0, 30)), "2026-10-22");
  assert.equal(M.tarihiMetneCevir(new Date(2026, 9, 22, 23, 59)), "2026-10-22");
});
test("gunEkle ay ve yıl sonunu geçer", () => {
  assert.equal(M.gunEkle("2026-10-31", 1), "2026-11-01");
  assert.equal(M.gunEkle("2026-12-31", 1), "2027-01-01");
  assert.equal(M.gunEkle("2026-03-01", -1), "2026-02-28");
});
test("haftaBasi pazartesiyi verir", () => {
  assert.equal(M.haftaBasi("2026-10-22"), "2026-10-19"); // perşembe
  assert.equal(M.haftaBasi("2026-10-25"), "2026-10-19"); // pazar
  assert.equal(M.haftaBasi("2026-10-19"), "2026-10-19"); // pazartesi
});
test("tarihMetniGecerliMi", () => {
  assert.ok(M.tarihMetniGecerliMi("2026-02-28"));
  assert.ok(!M.tarihMetniGecerliMi("2026-02-31"));
  assert.ok(!M.tarihMetniGecerliMi("22-10-2026"));
  assert.ok(!M.tarihMetniGecerliMi(null));
});
test("sureMetni tam dakikaları ve saniye hassasiyetini doğru gösterir", () => {
  assert.equal(M.sureMetni(45), "45 dk");
  assert.equal(M.sureMetni(60), "1 sa");
  assert.equal(M.sureMetni(100), "1 sa 40 dk");
  assert.equal(M.sureMetni(31 / 60), "31 sn");
  assert.equal(M.sureMetni(62 / 60), "1 dk 2 sn");
});

test("saniye hassasiyetli sayaç kaydı toplamları dakikaya yuvarlanmaz", () => {
  const kayitlar = [
    { id: "s1", dersId: "a", saniye: 31, tarih: "2026-10-22" },
    { id: "s2", dersId: "a", saniye: 31, tarih: "2026-10-22" }
  ];
  assert.equal(M.kayitDakikasi(kayitlar[0]), 31 / 60);
  assert.equal(M.gunlukToplam(kayitlar, "2026-10-22"), 62 / 60);
  assert.equal(M.sureMetni(M.gunlukToplam(kayitlar, "2026-10-22")), "1 dk 2 sn");
});

console.log("Ders");
test("Türkçe büyük/küçük harf: IRMAK = ırmak, İZMİR = izmir", () => {
  const dersler = [{ id: "1", ad: "ırmak" }, { id: "2", ad: "izmir" }];
  assert.ok(M.dersAdiKullanimda(dersler, "IRMAK"));
  assert.ok(M.dersAdiKullanimda(dersler, "İZMİR"));
  assert.ok(!M.dersAdiKullanimda(dersler, "mat"));
  assert.ok(!M.dersAdiKullanimda(dersler, "ırmak", "1")); // kendi adını koruyabilir
});

console.log("Seri");
const BUGUN = "2026-10-22";
test("hedef yoksa seri 0", () => {
  assert.deepEqual(M.seriHesapla([c(BUGUN, 100)], 0, BUGUN), { mevcut: 0, enUzun: 0 });
});
test("art arda 3 gün (bugün dahil) = 3", () => {
  const k = [c("2026-10-20", 60), c("2026-10-21", 60), c(BUGUN, 60)];
  assert.deepEqual(M.seriHesapla(k, 60, BUGUN), { mevcut: 3, enUzun: 3 });
});
test("bugün henüz tamamlanmadıysa dünkü seri korunur", () => {
  const k = [c("2026-10-20", 60), c("2026-10-21", 60), c(BUGUN, 10)];
  assert.equal(M.seriHesapla(k, 60, BUGUN).mevcut, 2);
});
test("iki gün boşluk seriyi 0'lar, en uzun korunur", () => {
  const k = [c("2026-10-18", 60), c("2026-10-19", 60), c("2026-10-20", 60)];
  assert.deepEqual(M.seriHesapla(k, 60, BUGUN), { mevcut: 0, enUzun: 3 });
});
test("aynı güne birden çok kayıt toplanır", () => {
  const k = [c(BUGUN, 30), c(BUGUN, 30)];
  assert.equal(M.seriHesapla(k, 60, BUGUN).mevcut, 1);
});
test("ay sonu geçişi", () => {
  const k = [c("2026-10-31", 60), c("2026-11-01", 60)];
  assert.equal(M.seriHesapla(k, 60, "2026-11-01").mevcut, 2);
});
test("kayıt silinince seri doğru düşer (Python sürümündeki hata)", () => {
  const k = [c("2026-10-21", 60), c(BUGUN, 60)];
  assert.equal(M.seriHesapla(k, 60, BUGUN).mevcut, 2);
  assert.equal(M.seriHesapla(k.slice(1), 60, BUGUN).mevcut, 1);
});

console.log("İlerleme");
test("ilerlemeDurumu", () => {
  assert.equal(M.ilerlemeDurumu(0, 0).tur, "hedefYok");
  assert.equal(M.ilerlemeDurumu(0, 90).tur, "baslamadi");
  assert.equal(M.ilerlemeDurumu(20, 90).tur, "baslangic");
  assert.equal(M.ilerlemeDurumu(70, 90).tur, "yaklasti");
  assert.equal(M.ilerlemeDurumu(90, 90).tur, "tamam");
});

console.log("Rapor");
test("haftaRaporu doğru günlere yazar, hafta dışını almaz", () => {
  const k = [c("2026-10-19", 10), c("2026-10-25", 5), c("2026-10-26", 7), c("2026-10-18", 9)];
  const r = M.haftaRaporu(k, "2026-10-19");
  assert.equal(r.toplam, 15);
  assert.equal(r.gunluk[0], 10);
  assert.equal(r.gunluk[6], 5);
  assert.equal(r.kayitSayisi, 2);
});
test("karşılaştırma mesajları", () => {
  assert.match(M.haftaKarsilastirmaMesaji(100, 90), /10 dk daha fazla/);
  assert.match(M.haftaKarsilastirmaMesaji(80, 90), /10 dk daha az/);
  assert.match(M.haftaKarsilastirmaMesaji(0, 0), /Son iki haftada/);
});

console.log("Doğrulama");
test("geçerli veri aynen geçer, bozuk kayıtlar atılır", () => {
  const ham = {
    ayarlar: { ad: " Deniz ", gunlukHedef: 90 },
    dersler: [{ id: "d1", ad: "Mat", gunlukHedef: 15 }, { id: "d1", ad: "Kopya" }, { ad: "kimliksiz" }],
    calismalar: [
      { id: "k1", dersId: "d1", dakika: 20, tarih: "2026-10-22" },
      { id: "k2", dersId: "yok", dakika: 20, tarih: "2026-10-22" },      // ders yok
      { id: "k3", dersId: "d1", dakika: -5, tarih: "2026-10-22" },       // negatif
      { id: "k4", dersId: "d1", dakika: 20, tarih: "2026-02-31" },       // geçersiz tarih
      { id: "k5", dersId: "d1", dakika: 99999, tarih: "2026-10-22" }     // çok büyük
    ]
  };
  const s = M.veriyiDogrula(ham, { varsayilanAd: "X" });
  assert.equal(s.veri.ayarlar.ad, "Deniz");
  assert.equal(s.veri.ayarlar.gunlukHedef, 90);
  assert.equal(s.veri.dersler.length, 1);
  assert.equal(s.veri.calismalar.length, 1);
  assert.equal(s.atilan, 6);
});
test("veri doğrulama saniye hassasiyetli sayaç kayıtlarını korur", () => {
  const ham = {
    dersler: [{ id: "d1", ad: "Mat", gunlukHedef: 0 }],
    calismalar: [
      { id: "eski", dersId: "d1", dakika: 5, tarih: "2026-10-22" },
      { id: "sayac", dersId: "d1", saniye: 31, tarih: "2026-10-22" }
    ]
  };
  const sonuc = M.veriyiDogrula(ham);
  assert.equal(sonuc.atilan, 0);
  assert.deepEqual(sonuc.veri.calismalar[1], { id: "sayac", dersId: "d1", saniye: 31, tarih: "2026-10-22" });
  assert.equal(M.sureMetni(M.gunlukToplam(sonuc.veri.calismalar, "2026-10-22")), "5 dk 31 sn");
});

test("saçma girdi null döner", () => {
  assert.equal(M.veriyiDogrula(null), null);
  assert.equal(M.veriyiDogrula([1, 2]), null);
  assert.equal(M.veriyiDogrula("metin"), null);
});

console.log("Kayan nokta hatası (regresyon)");
test("saniyeli kayıtların toplamı tam hedefe eşitse hedef tamamlanmış sayılır", () => {
  const k = [12, 26, 16, 4, 2].map((s, i) => ({ id: "k" + i, dersId: "a", saniye: s, tarih: "2026-10-22" }));
  assert.equal(M.gunlukToplam(k, "2026-10-22"), 1);
  assert.equal(M.seriHesapla(k, 1, "2026-10-22").mevcut, 1);
  assert.equal(M.ilerlemeDurumu(M.gunlukToplam(k, "2026-10-22"), 1).tur, "tamam");
});
test("rastgele bölünmüş saniyeler: toplam hiçbir zaman hedefin altında çıkmaz (7200 deneme)", () => {
  for (let hedef = 1; hedef <= 120; hedef++) {
    for (let deneme = 0; deneme < 60; deneme++) {
      let kalan = hedef * 60;
      const parca = 2 + Math.floor(Math.random() * 6);
      const k = [];
      for (let i = 0; i < parca - 1; i++) {
        const s = 1 + Math.floor(Math.random() * (kalan - (parca - 1 - i)));
        k.push({ id: "k" + i, dersId: "a", saniye: s, tarih: "2026-10-22" });
        kalan -= s;
      }
      k.push({ id: "son", dersId: "a", saniye: kalan, tarih: "2026-10-22" });
      assert.equal(M.gunlukToplam(k, "2026-10-22"), hedef, `hedef ${hedef}, kayıtlar ${k.map((x) => x.saniye)}`);
      assert.equal(M.dersToplamlari(k)["a"], hedef);
      assert.equal(M.gunlereGoreToplamlar(k)["2026-10-22"], hedef);
      assert.equal(M.kayitlarinToplami(k), hedef);
    }
  }
});
test("haftalık rapor da saniye tabanlı toplar; eşit haftalar 'aynı miktar' der", () => {
  const bu = [1, 2, 3, 4].map((s, i) => ({ id: "b" + i, dersId: "a", saniye: 10 * s + 7, tarih: "2026-10-20" }));
  const gecen = [4, 3, 2, 1].map((s, i) => ({ id: "g" + i, dersId: "a", saniye: 10 * s + 7, tarih: "2026-10-13" }));
  const rb = M.haftaRaporu(bu, "2026-10-19"), rg = M.haftaRaporu(gecen, "2026-10-12");
  assert.equal(rb.toplam, rg.toplam);
  assert.match(M.haftaKarsilastirmaMesaji(rb.toplam, rg.toplam), /aynı miktarda/);
});
test("kayitSaniyesi: eski dakika kayıtları ve yeni saniye kayıtları", () => {
  assert.equal(M.kayitSaniyesi({ dakika: 5 }), 300);
  assert.equal(M.kayitSaniyesi({ saniye: 31 }), 31);
});

console.log("Karşılama");
test("karsilamaMetni addan otomatik üretilir, emoji temadan gelir", () => {
  assert.equal(M.karsilamaMetni("Ayşe", { karsilamaEmojisi: "🌸" }), "Hoş geldin, Ayşe 🌸");
  assert.equal(M.karsilamaMetni("  Ayşe  ", {}), "Hoş geldin, Ayşe");
  assert.equal(M.karsilamaMetni("", { karsilamaEmojisi: "🌸" }), "Hoş geldin 🌸");
  assert.equal(M.karsilamaMetni(undefined, null), "Hoş geldin");
});
test("eski yedeklerdeki hosgeldinMetni alanı atılır, veri bozulmaz", () => {
  const s = M.veriyiDogrula({ ayarlar: { ad: "Deniz", hosgeldinMetni: "Selam {ad}", gunlukHedef: 60 }, dersler: [], calismalar: [] });
  assert.equal(s.veri.ayarlar.hosgeldinMetni, undefined);
  assert.equal(s.veri.ayarlar.ad, "Deniz");
  assert.equal(s.veri.ayarlar.gunlukHedef, 60);
  assert.equal(M.varsayilanVeri({ varsayilanAd: "X" }).ayarlar.hosgeldinMetni, undefined);
});

console.log(`\n${gecen} test geçti`);
