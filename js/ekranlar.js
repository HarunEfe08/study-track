// 5 ekran burada: Bugün, Dersler, Geçmiş, Rapor, Ayarlar.
// Her biri bir element döndürüyor, ekrana koymayı uygulama.js yapıyor.

const Ekranlar = {
  sonDers: null,          // en son seçilen ders, form yenilenince hatırlansın
  gecmisGunLimiti: 30,    // geçmişte kaç gün gösterilsin
  sayacZamanlayici: null
};

// sayfa değişirken sayaç yazısını güncelleyen zamanlayıcıyı durdurur
Ekranlar.temizle = function () {
  clearInterval(Ekranlar.sayacZamanlayici);
  Ekranlar.sayacZamanlayici = null;
};

function dersAdi(dersler, id) {
  for (let i = 0; i < dersler.length; i++) {
    if (dersler[i].id === id) return dersler[i].ad;
  }
  return "Silinmiş ders";
}

function bosDurum(emoji, metin) {
  return el("div", { sinif: "bos" },
    el("div", { sinif: "bos-emoji", "aria-hidden": "true" }, emoji),
    el("p", {}, metin));
}

// ---------- BUGÜN ----------

// 3725000 ms -> "01:02:05"
function sureyiBicimle(milisaniye) {
  const toplam = Math.max(0, Math.floor(milisaniye / 1000));
  const saat = String(Math.floor(toplam / 3600)).padStart(2, "0");
  const dakika = String(Math.floor((toplam % 3600) / 60)).padStart(2, "0");
  const saniye = String(toplam % 60).padStart(2, "0");
  return saat + ":" + dakika + ":" + saniye;
}

// Sayaç şu ana kadar kaç ms çalıştı: duraklatmadan önce biriken + şu an çalışan kısım
function sayacGecenMs(sayac) {
  let sure = sayac.birikenMs || 0;
  if (sayac.baslangic !== null) sure += Math.max(0, Date.now() - sayac.baslangic);
  return sure;
}

function sayaciCiz(kap, dersSecimi) {
  clearInterval(Ekranlar.sayacZamanlayici);
  Ekranlar.sayacZamanlayici = null;
  kap.replaceChildren();

  const sayac = Depolama.sayaciOku();

  // sayaç yoksa sadece başlat düğmesi
  if (!sayac) {
    kap.append(el("button", {
      type: "button", sinif: "dugme ikincil",
      onClick: function () {
        Depolama.sayaciKaydet({ baslangic: Date.now(), birikenMs: 0, dersId: dersSecimi.value });
        sayaciCiz(kap, dersSecimi);
      }
    }, "▶ Sayacı başlat"));
    return;
  }

  // sayaç çalışırken ders silinmiş olabilir
  let ders = null;
  for (let i = 0; i < Uygulama.durum.dersler.length; i++) {
    if (Uygulama.durum.dersler[i].id === sayac.dersId) ders = Uygulama.durum.dersler[i];
  }
  if (!ders) {
    Depolama.sayaciKaydet(null);
    sayaciCiz(kap, dersSecimi);
    return;
  }

  const duraklatildi = sayac.baslangic === null;
  const zaman = el("strong", { sinif: "sayac-zaman", "aria-live": "off" }, "00:00:00");
  function zamaniGuncelle() {
    zaman.textContent = sureyiBicimle(sayacGecenMs(sayac));
  }
  zamaniGuncelle();
  if (!duraklatildi) Ekranlar.sayacZamanlayici = setInterval(zamaniGuncelle, 1000);

  // durdur / devam et düğmesi
  let durdurDevamDugmesi;
  if (duraklatildi) {
    durdurDevamDugmesi = el("button", {
      type: "button", sinif: "dugme ikincil",
      onClick: function () {
        Depolama.sayaciKaydet({ baslangic: Date.now(), birikenMs: sayacGecenMs(sayac), dersId: sayac.dersId });
        sayaciCiz(kap, dersSecimi);
      }
    }, "▶ Devam et");
  } else {
    durdurDevamDugmesi = el("button", {
      type: "button", sinif: "dugme ikincil",
      onClick: function () {
        Depolama.sayaciKaydet({ baslangic: null, birikenMs: sayacGecenMs(sayac), dersId: sayac.dersId });
        sayaciCiz(kap, dersSecimi);
      }
    }, "Ⅱ Durdur");
  }

  const iptalDugmesi = el("button", {
    type: "button", sinif: "dugme ikincil",
    onClick: function () {
      Depolama.sayaciKaydet(null);
      sayaciCiz(kap, dersSecimi);
    }
  }, "İptal");

  const bitirDugmesi = el("button", {
    type: "button", sinif: "dugme",
    onClick: function () {
      const gecen = sayacGecenMs(sayac);
      Depolama.sayaciKaydet(null);
      if (gecen < 30000) {
        bildir("Sayaç 30 saniyeden kısa sürdü, kaydedilmedi.");
        sayaciCiz(kap, dersSecimi);
        return;
      }
      let saniye = Math.floor(gecen / 1000);
      if (saniye > EN_FAZLA_KAYIT_SANIYESI) saniye = EN_FAZLA_KAYIT_SANIYESI;
      Uygulama.calismaEkle(sayac.dersId, null, Mantik.bugunMetni(), saniye);
    }
  }, "■ Bitir ve kaydet");

  kap.append(
    el("div", { sinif: "sayac" }, el("span", {}, "⏱ ", ders.ad), zaman),
    el("div", { sinif: "dugme-sirasi" }, durdurDevamDugmesi, iptalDugmesi, bitirDugmesi)
  );
}

function calismaKarti() {
  const d = Uygulama.durum;
  const kart = el("section", { sinif: "kart" }, el("h2", {}, "Çalışma ekle"));

  // ders yoksa önce ders eklemesini söyle
  if (d.dersler.length === 0) {
    kart.append(
      el("p", { sinif: "soluk" }, "Çalışma kaydı eklemek için önce bir ders eklemelisin."),
      el("a", { sinif: "dugme", href: "#/dersler" }, "Ders ekle"));
    return kart;
  }

  const bugun = Mantik.bugunMetni();

  const secenekler = [];
  for (let i = 0; i < d.dersler.length; i++) {
    const ders = d.dersler[i];
    secenekler.push(el("option", { value: ders.id, selected: ders.id === Ekranlar.sonDers }, ders.ad));
  }
  const dersSecimi = el("select", { id: "cDers" }, secenekler);
  const dakikaGirdisi = el("input", {
    id: "cDakika", type: "number", min: 1, max: EN_FAZLA_KAYIT_DAKIKASI, step: 1,
    inputmode: "numeric", required: true, placeholder: "Kaç dakika?"
  });
  const tarihGirdisi = el("input", { id: "cTarih", type: "date", value: bugun, max: bugun, required: true });
  const sayacKabi = el("div", { sinif: "sayac-kabi" });

  // hızlı seçim düğmeleri
  const hizliDugmeler = [];
  const hizliSureler = [15, 25, 45, 60];
  for (let i = 0; i < hizliSureler.length; i++) {
    const dk = hizliSureler[i];
    hizliDugmeler.push(el("button", {
      type: "button", sinif: "hizli",
      onClick: function () {
        dakikaGirdisi.value = dk;
        dakikaGirdisi.focus();
      }
    }, dk + " dk"));
  }

  const form = el("form", {
    onSubmit: function (olay) {
      olay.preventDefault();
      const dakika = Number(dakikaGirdisi.value);
      if (!Number.isInteger(dakika) || dakika < 1 || dakika > EN_FAZLA_KAYIT_DAKIKASI) {
        bildir("Dakika 1 ile " + EN_FAZLA_KAYIT_DAKIKASI + " arasında bir tam sayı olmalı.", "hata");
        return;
      }
      if (!Mantik.tarihMetniGecerliMi(tarihGirdisi.value) || tarihGirdisi.value > Mantik.bugunMetni()) {
        bildir("Geçerli bir tarih seç (gelecek bir gün olamaz).", "hata");
        return;
      }
      Ekranlar.sonDers = dersSecimi.value;
      Uygulama.calismaEkle(dersSecimi.value, dakika, tarihGirdisi.value);
    }
  },
    el("div", { sinif: "alan" }, el("label", { for: "cDers" }, "Ders"), dersSecimi),
    el("div", { sinif: "iki-sutun" },
      el("div", { sinif: "alan" }, el("label", { for: "cDakika" }, "Dakika"), dakikaGirdisi),
      el("div", { sinif: "alan" }, el("label", { for: "cTarih" }, "Tarih"), tarihGirdisi)),
    el("div", { sinif: "hizli-sira", "aria-label": "Hızlı süre seçimi" }, hizliDugmeler),
    el("button", { type: "submit", sinif: "dugme tam" }, "Kaydet"));

  dersSecimi.addEventListener("change", function () {
    Ekranlar.sonDers = dersSecimi.value;
  });

  kart.append(form, el("hr", { sinif: "ayrac" }), el("p", { sinif: "soluk kucuk" }, "veya sayaçla çalış:"), sayacKabi);
  sayaciCiz(sayacKabi, dersSecimi);
  return kart;
}

function dersHedefleriKarti() {
  const d = Uygulama.durum;
  const bugun = Mantik.bugunMetni();

  const satirlar = [];
  for (let i = 0; i < d.dersler.length; i++) {
    const ders = d.dersler[i];
    if (ders.gunlukHedef <= 0) continue;

    const toplam = Mantik.gunlukToplam(d.calismalar, bugun, ders.id);
    const tamam = toplam >= ders.gunlukHedef;
    satirlar.push(el("li", { sinif: "hedef-satiri" },
      el("div", { sinif: "satir" },
        el("strong", {}, (tamam ? "✅ " : "⏳ ") + ders.ad),
        el("span", { sinif: "soluk" }, Mantik.sureMetni(toplam) + " / " + ders.gunlukHedef + " dk")),
      cubuk(toplam / ders.gunlukHedef, tamam ? "tamam" : "")));
  }

  if (satirlar.length === 0) return null;
  return el("section", { sinif: "kart" }, el("h2", {}, "Ders hedeflerin"), el("ul", { sinif: "liste" }, satirlar));
}

Ekranlar.bugun = function () {
  const d = Uygulama.durum;
  const bugun = Mantik.bugunMetni();
  const hedef = d.ayarlar.gunlukHedef;
  const toplam = Mantik.gunlukToplam(d.calismalar, bugun);
  const ilerleme = Mantik.ilerlemeDurumu(toplam, hedef);
  const seri = Mantik.seriHesapla(d.calismalar, hedef, bugun);
  const rozet = Mantik.seriRozeti(seri.mevcut);

  // üstteki karşılama
  const selam = el("section", { sinif: "selam" },
    el("h1", {}, Mantik.karsilamaMetni(d.ayarlar.ad, window.TEMA)),
    hedef > 0 ? el("div", { sinif: "cipler" },
      el("span", { sinif: "cip" }, "🔥 Seri: " + seri.mevcut + " gün"),
      el("span", { sinif: "cip" }, "🏆 En uzun: " + seri.enUzun + " gün")) : null,
    rozet ? el("p", { sinif: "rozet" }, "🔥 " + rozet) : null);

  const ilerlemeKarti = el("section", { sinif: "kart ilerleme-karti" },
    el("h2", {}, "Bugünkü ilerleme"),
    ilerlemeHalkasi(ilerleme.oran, Mantik.sureMetni(toplam), hedef > 0 ? "hedef " + Mantik.sureMetni(hedef) : "bugün"),
    el("p", { sinif: "ilerleme-mesaj" }, ilerleme.mesaj),
    hedef > 0
      ? el("p", { sinif: "soluk" }, "Hedefe ulaşma oranı %" + Math.round(ilerleme.oran * 100))
      : el("a", { sinif: "dugme", href: "#/ayarlar" }, "Hedef belirle"));

  // hiç kayıt yoksa kısa bir yönlendirme göster
  let ilkKullanim = null;
  if (d.calismalar.length === 0) {
    ilkKullanim = el("section", { sinif: "kart" },
      el("h2", {}, "Hızlı başlangıç"),
      el("ol", { sinif: "adimlar" },
        el("li", {}, el("a", { href: "#/ayarlar" }, "Ayarlar"), "'dan adını ve günlük hedefini gir."),
        el("li", {}, el("a", { href: "#/dersler" }, "Dersler"), " sekmesinden derslerini ekle."),
        el("li", {}, "Aşağıdan çalışmanı ekle ya da sayacı başlat, serin kendiliğinden oluşur.")));
  }

  return el("div", { sinif: "sayfa" }, selam, ilkKullanim,
    el("div", { sinif: "izgara" }, ilerlemeKarti, calismaKarti()),
    dersHedefleriKarti());
};

// ---------- DERSLER ----------

async function dersiDuzenle(ders) {
  const sonuc = await formKutusu({
    baslik: "Dersi düzenle",
    alanlar: [
      { ad: "ad", etiket: "Ders adı", deger: ders.ad, zorunlu: true, uzunluk: 40 },
      { ad: "hedef", etiket: "Günlük hedef (dakika, 0 = hedef yok)", tur: "number", deger: ders.gunlukHedef, min: 0, max: 1440 }
    ]
  });
  if (sonuc) Uygulama.dersGuncelle(ders.id, sonuc.ad, Number(sonuc.hedef));
}

async function dersiSil(ders) {
  let kayitSayisi = 0;
  for (let i = 0; i < Uygulama.durum.calismalar.length; i++) {
    if (Uygulama.durum.calismalar[i].dersId === ders.id) kayitSayisi++;
  }
  let mesaj = '"' + ders.ad + '" dersi silinsin mi?';
  if (kayitSayisi > 0) mesaj += " Bu derse ait " + kayitSayisi + " çalışma kaydı da silinecek.";

  if (await onayla(mesaj, "Evet, sil")) Uygulama.dersSil(ders.id);
}

Ekranlar.dersler = function () {
  const d = Uygulama.durum;
  const toplamlar = Mantik.dersToplamlari(d.calismalar);

  const girdi = el("input", {
    type: "text", maxlength: 40, required: true, placeholder: "Yeni ders adı (ör. Anatomi)",
    "aria-label": "Yeni ders adı", autocomplete: "off"
  });
  const ekleFormu = el("form", {
    sinif: "satir-form",
    onSubmit: function (olay) {
      olay.preventDefault();
      if (Uygulama.dersEkle(girdi.value)) girdi.value = "";
    }
  }, girdi, el("button", { type: "submit", sinif: "dugme" }, "Ekle"));

  let liste;
  if (d.dersler.length === 0) {
    liste = bosDurum("📚", "Henüz ders yok. Yukarıdan ilk dersini ekle!");
  } else {
    const satirlar = [];
    for (let i = 0; i < d.dersler.length; i++) {
      const ders = d.dersler[i];
      const toplam = toplamlar[ders.id] || 0;
      let hedefMetni = "";
      if (ders.gunlukHedef > 0) hedefMetni = " · günlük hedef " + ders.gunlukHedef + " dk";

      satirlar.push(el("li", { sinif: "kart satir ders-satiri" },
        el("div", { sinif: "ders-bilgi" },
          el("strong", {}, ders.ad),
          el("span", { sinif: "soluk" }, "Toplam " + Mantik.sureMetni(toplam) + hedefMetni)),
        el("div", { sinif: "satir-dugmeleri" },
          el("button", {
            type: "button", sinif: "dugme ikincil kucuk", "aria-label": ders.ad + " dersini düzenle",
            onClick: function () { dersiDuzenle(ders); }
          }, "✏️ Düzenle"),
          el("button", {
            type: "button", sinif: "dugme tehlike kucuk", "aria-label": ders.ad + " dersini sil",
            onClick: function () { dersiSil(ders); }
          }, "🗑"))));
    }
    liste = el("ul", { sinif: "liste" }, satirlar);
  }

  return el("div", { sinif: "sayfa" },
    el("h1", {}, "Derslerin"),
    el("section", { sinif: "kart" }, el("h2", {}, "Ders ekle"), ekleFormu),
    liste);
};

// ---------- GEÇMİŞ ----------

async function kaydiSil(kayit) {
  const ad = dersAdi(Uygulama.durum.dersler, kayit.dersId);
  const sure = Mantik.sureMetni(Mantik.kayitDakikasi(kayit));
  const mesaj = tarihiGoster(kayit.tarih) + " tarihli " + ad + " · " + sure + " kaydı silinsin mi?";
  if (await onayla(mesaj, "Evet, sil")) Uygulama.calismaSil(kayit.id);
}

Ekranlar.gecmis = function () {
  const d = Uygulama.durum;
  const sayfa = el("div", { sinif: "sayfa" }, el("h1", {}, "Çalışma geçmişi"));

  if (d.calismalar.length === 0) {
    sayfa.append(bosDurum("🕘", "Henüz çalışma kaydı yok. Bugün sayfasından ilk kaydını ekleyebilirsin."));
    return sayfa;
  }

  // kayıtları tarihe göre grupla
  const gruplar = {};
  for (let i = 0; i < d.calismalar.length; i++) {
    const kayit = d.calismalar[i];
    if (!gruplar[kayit.tarih]) gruplar[kayit.tarih] = [];
    gruplar[kayit.tarih].push(kayit);
  }
  const tarihler = Object.keys(gruplar).sort().reverse(); // en yeni gün üstte

  for (let i = 0; i < tarihler.length && i < Ekranlar.gecmisGunLimiti; i++) {
    const tarih = tarihler[i];
    const kayitlar = gruplar[tarih].slice().reverse(); // gün içinde de en yeni üstte

    const satirlar = [];
    for (let j = 0; j < kayitlar.length; j++) {
      const kayit = kayitlar[j];
      const ad = dersAdi(d.dersler, kayit.dersId);
      const sure = Mantik.sureMetni(Mantik.kayitDakikasi(kayit));
      satirlar.push(el("li", { sinif: "satir kayit-satiri" },
        el("span", {}, el("strong", {}, ad), el("span", { sinif: "soluk" }, " · " + sure)),
        el("button", {
          type: "button", sinif: "dugme tehlike kucuk", "aria-label": ad + " " + sure + " kaydı sil",
          onClick: function () { kaydiSil(kayit); }
        }, "🗑")));
    }

    sayfa.append(el("section", { sinif: "kart gun-grubu" },
      el("div", { sinif: "satir gun-baslik" },
        el("h2", {}, tarihiGoster(tarih, true)),
        el("span", { sinif: "cip" }, Mantik.sureMetni(Mantik.kayitlarinToplami(kayitlar)))),
      el("ul", { sinif: "liste" }, satirlar)));
  }

  if (tarihler.length > Ekranlar.gecmisGunLimiti) {
    sayfa.append(el("button", {
      type: "button", sinif: "dugme ikincil tam",
      onClick: function () {
        Ekranlar.gecmisGunLimiti += 30;
        Uygulama.yenile();
      }
    }, "Daha eski kayıtları göster"));
  }
  return sayfa;
};

// ---------- RAPOR ----------

Ekranlar.rapor = function () {
  const d = Uygulama.durum;
  const sayfa = el("div", { sinif: "sayfa" }, el("h1", {}, "Raporlar"));

  if (d.calismalar.length === 0) {
    sayfa.append(bosDurum("📊", "Rapor görmek için önce birkaç çalışma kaydı ekle."));
    return sayfa;
  }

  const buHaftaBasi = Mantik.haftaBasi(Mantik.bugunMetni());
  const bu = Mantik.haftaRaporu(d.calismalar, buHaftaBasi);
  const gecen = Mantik.haftaRaporu(d.calismalar, Mantik.gunEkle(buHaftaBasi, -7));

  // --- haftalık grafik ---
  // en uzun çubuk 150px olsun, diğerleri ona göre
  let enYuksek = 1;
  for (let i = 0; i < 7; i++) {
    if (bu.gunluk[i] > enYuksek) enYuksek = bu.gunluk[i];
    if (gecen.gunluk[i] > enYuksek) enYuksek = gecen.gunluk[i];
  }
  function yukseklik(dakika) {
    if (dakika === 0) return 0;
    return Math.max(4, Math.round(dakika / enYuksek * 150));
  }

  const sutunlar = [];
  const tabloSatirlari = [];
  for (let i = 0; i < 7; i++) {
    sutunlar.push(el("div", {
      sinif: "sutun-grubu",
      title: GUN_ADLARI[i] + ": bu hafta " + Mantik.sureMetni(bu.gunluk[i]) + ", geçen hafta " + Mantik.sureMetni(gecen.gunluk[i])
    },
      el("div", { sinif: "sutun-cubuklari" },
        el("div", { sinif: "sutun gecen", style: "height:" + yukseklik(gecen.gunluk[i]) + "px" }),
        el("div", { sinif: "sutun bu", style: "height:" + yukseklik(bu.gunluk[i]) + "px" })),
      el("span", { sinif: "sutun-etiket" }, KISA_GUN_ADLARI[i])));

    tabloSatirlari.push(el("tr", {},
      el("td", {}, GUN_ADLARI[i]),
      el("td", {}, Mantik.sureMetni(bu.gunluk[i])),
      el("td", {}, Mantik.sureMetni(gecen.gunluk[i]))));
  }

  const tablo = el("table", { sinif: "tablo" },
    el("thead", {}, el("tr", {}, el("th", {}, "Gün"), el("th", {}, "Bu hafta"), el("th", {}, "Geçen hafta"))),
    el("tbody", {}, tabloSatirlari));

  sayfa.append(el("section", { sinif: "kart" },
    el("h2", {}, "Haftalık rapor"),
    el("p", { sinif: "ilerleme-mesaj" }, Mantik.haftaKarsilastirmaMesaji(bu.toplam, gecen.toplam)),
    el("div", { sinif: "cipler" },
      el("span", { sinif: "cip" }, "Bu hafta: " + Mantik.sureMetni(bu.toplam)),
      el("span", { sinif: "cip" }, "Geçen hafta: " + Mantik.sureMetni(gecen.toplam))),
    el("div", { sinif: "sutunlar", role: "img", "aria-label": "Günlere göre çalışma süreleri grafiği; ayrıntılar aşağıdaki tabloda" }, sutunlar),
    el("div", { sinif: "gosterge" },
      el("span", {}, el("i", { sinif: "nokta bu" }), "Bu hafta"),
      el("span", {}, el("i", { sinif: "nokta gecen" }), "Geçen hafta")),
    el("details", {}, el("summary", {}, "Sayısal görünüm"), tablo)));

  // --- derslere göre toplam ---
  const dersToplamlari = Mantik.dersToplamlari(d.calismalar);
  const liste = [];
  let genelToplam = 0;
  for (const id in dersToplamlari) {
    liste.push({ ad: dersAdi(d.dersler, id), dakika: dersToplamlari[id] });
    genelToplam += dersToplamlari[id];
  }
  liste.sort(function (a, b) { return b.dakika - a.dakika; }); // en çok çalışılan başta

  const dersSatirlari = [];
  for (let i = 0; i < liste.length; i++) {
    dersSatirlari.push(el("li", { sinif: "hedef-satiri" },
      el("div", { sinif: "satir" },
        el("strong", {}, liste[i].ad),
        el("span", { sinif: "soluk" }, Mantik.sureMetni(liste[i].dakika))),
      cubuk(liste[i].dakika / liste[0].dakika)));
  }

  sayfa.append(el("section", { sinif: "kart" },
    el("h2", {}, "Derslere göre toplam"),
    el("p", { sinif: "soluk" }, "Genel toplam: " + Mantik.sureMetni(genelToplam) + " · En çok çalışılan: " + liste[0].ad),
    el("ul", { sinif: "liste" }, dersSatirlari)));

  return sayfa;
};

// ---------- AYARLAR ----------

async function yedektenYukle(dosya) {
  if (!dosya) return;
  if (dosya.size > 5 * 1024 * 1024) {
    bildir("Dosya çok büyük (en fazla 5 MB).", "hata");
    return;
  }

  let ham;
  try {
    ham = JSON.parse(await dosya.text());
  } catch (e) {
    bildir("Bu dosya geçerli bir yedek değil.", "hata");
    return;
  }
  const sonuc = Mantik.veriyiDogrula(ham, window.TEMA);
  if (!sonuc) {
    bildir("Bu dosya geçerli bir yedek değil.", "hata");
    return;
  }

  let mesaj = "Şu anki verilerin silinip yedekteki veriler yüklensin mi? Yedekte: "
    + sonuc.veri.dersler.length + " ders, " + sonuc.veri.calismalar.length + " kayıt";
  if (sonuc.atilan > 0) mesaj += " (" + sonuc.atilan + " bozuk kayıt atlanacak)";
  mesaj += ".";

  if (await onayla(mesaj, "Evet, yükle")) Uygulama.veriyiDegistir(sonuc.veri);
}

Ekranlar.ayarlar = function () {
  const d = Uygulama.durum;

  // --- günlük hedef ---
  const saatGirdisi = el("input", {
    id: "aSaat", type: "number", min: 0, max: 24, step: 1, inputmode: "numeric",
    value: Math.floor(d.ayarlar.gunlukHedef / 60)
  });
  const dakikaGirdisi = el("input", {
    id: "aDakika", type: "number", min: 0, max: 59, step: 1, inputmode: "numeric",
    value: d.ayarlar.gunlukHedef % 60
  });
  const hedefFormu = el("form", {
    onSubmit: function (olay) {
      olay.preventDefault();
      const saat = Number(saatGirdisi.value);
      const dakika = Number(dakikaGirdisi.value);
      if (!Number.isInteger(saat) || !Number.isInteger(dakika) || saat < 0 || dakika < 0 || dakika > 59) {
        bildir("Saat ve dakika için geçerli (negatif olmayan, tam) sayılar gir.", "hata");
        return;
      }
      if (saat * 60 + dakika > 1440) {
        bildir("Günlük hedef 24 saati geçemez.", "hata");
        return;
      }
      Uygulama.ayarlariKaydet({ gunlukHedef: saat * 60 + dakika }, "Günlük hedefin kaydedildi.");
    }
  },
    el("div", { sinif: "iki-sutun" },
      el("div", { sinif: "alan" }, el("label", { for: "aSaat" }, "Saat"), saatGirdisi),
      el("div", { sinif: "alan" }, el("label", { for: "aDakika" }, "Dakika"), dakikaGirdisi)),
    el("p", { sinif: "soluk kucuk" }, "0 saat 0 dakika girersen hedef kaldırılır."),
    el("button", { type: "submit", sinif: "dugme" }, "Hedefi kaydet"));

  // --- profil ---
  const adGirdisi = el("input", {
    id: "aAd", type: "text", maxlength: 40, value: d.ayarlar.ad, autocomplete: "off", placeholder: "Adın"
  });
  const profilFormu = el("form", {
    onSubmit: function (olay) {
      olay.preventDefault();
      Uygulama.ayarlariKaydet({ ad: adGirdisi.value.trim() }, "Profilin kaydedildi.");
    }
  },
    el("div", { sinif: "alan" }, el("label", { for: "aAd" }, "Adın"), adGirdisi),
    el("p", { sinif: "soluk kucuk" }, "Karşılama mesajın adından otomatik oluşturulur."),
    el("button", { type: "submit", sinif: "dugme" }, "Kaydet"));

  // --- veriler (yedek) ---
  const dosyaGirdisi = el("input", {
    type: "file", accept: ".json,application/json", sinif: "gizli", tabindex: -1,
    onChange: async function (olay) {
      await yedektenYukle(olay.target.files[0]);
      olay.target.value = "";
    }
  });
  const veriKarti = el("section", { sinif: "kart" },
    el("h2", {}, "Verilerin"),
    el("p", { sinif: "soluk" }, "Verilerin yalnızca bu tarayıcıda saklanır. Tarayıcı verilerini silersen ya da cihaz değiştirirsen kaybolur, bu yüzden ara sıra yedek al."),
    el("div", { sinif: "dugme-sirasi sola" },
      el("button", {
        type: "button", sinif: "dugme",
        onClick: function () {
          dosyaIndir("study-track-yedek-" + Mantik.bugunMetni() + ".json", JSON.stringify(Uygulama.durum, null, 2));
          bildir("Yedek indirildi.", "basari");
        }
      }, "⬇ Yedek indir"),
      el("button", { type: "button", sinif: "dugme ikincil", onClick: function () { dosyaGirdisi.click(); } }, "⬆ Yedekten yükle"),
      dosyaGirdisi),
    el("hr", { sinif: "ayrac" }),
    el("button", {
      type: "button", sinif: "dugme tehlike",
      onClick: async function () {
        if (await onayla("Tüm dersler, çalışma kayıtları ve ayarlar silinecek. Bu işlem geri alınamaz.", "Evet, hepsini sil")) {
          Uygulama.hepsiniSil();
        }
      }
    }, "Tüm verileri sil"));

  // görünüm (açık / koyu / otomatik), sadece temada izin verilmişse
  let gorunumKarti = null;
  if (window.TEMA && window.TEMA.temaSecimi) {
    const secili = Depolama.temaOku();
    const secenekler = [["otomatik", "🖥 Otomatik"], ["acik", "☀️ Açık"], ["koyu", "🌙 Koyu"]];
    const dugmeler = [];
    for (let i = 0; i < secenekler.length; i++) {
      const anahtar = secenekler[i][0];
      dugmeler.push(el("button", {
        type: "button", sinif: "dugme kucuk " + (anahtar === secili ? "" : "ikincil"), "aria-pressed": anahtar === secili,
        "data-tema-secimi": anahtar,
        onClick: function () { Uygulama.temaDegistir(anahtar); }
      }, secenekler[i][1]));
    }
    gorunumKarti = el("section", { sinif: "kart" },
      el("h2", {}, "Görünüm"),
      el("p", { sinif: "soluk kucuk" }, "Otomatik seçersen cihazının açık/koyu ayarı kullanılır."),
      el("div", { sinif: "dugme-sirasi sola" }, dugmeler));
  }

  // tarayıcı izin verdiyse "uygulamayı yükle" kartı
  let kurulum = null;
  if (Uygulama.kurulumIstemi) {
    kurulum = el("section", { sinif: "kart" },
      el("h2", {}, "Uygulama olarak yükle"),
      el("p", { sinif: "soluk" }, "Telefonunun ya da bilgisayarının ana ekranına ekleyip uygulama gibi açabilirsin."),
      el("button", {
        type: "button", sinif: "dugme",
        onClick: async function () {
          const istem = Uygulama.kurulumIstemi;
          Uygulama.kurulumIstemi = null;
          istem.prompt();
          await istem.userChoice;
          Uygulama.yenile();
        }
      }, "Yükle"));
  }

  // en altta site adı, sürüm ve (varsa) gizlilik bağlantısı
  const siteAdi = (window.TEMA && window.TEMA.siteAdi) || "Study Track";
  let gizlilik = null;
  if (window.TEMA && window.TEMA.gizlilikSayfasi) {
    gizlilik = [" · ", el("a", { href: window.TEMA.gizlilikSayfasi, target: "_blank", rel: "noopener" }, "Gizlilik")];
  }

  return el("div", { sinif: "sayfa" },
    el("h1", {}, "Ayarlar"),
    el("section", { sinif: "kart" }, el("h2", {}, "Günlük hedef"), hedefFormu),
    el("section", { sinif: "kart" }, el("h2", {}, "Profil"), profilFormu),
    gorunumKarti, veriKarti, kurulum,
    el("p", { sinif: "soluk kucuk orta" }, siteAdi + " · v" + Uygulama.SURUM, gizlilik));
};
