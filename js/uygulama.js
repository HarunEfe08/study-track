// Uygulamanın ana parçası: veriyi tutar, veriyi değiştiren işlemleri yapar,
// sayfa geçişlerini yönetir.

const SAYFALAR = ["bugun", "dersler", "gecmis", "rapor", "ayarlar"];

const Uygulama = {
  SURUM: "1.0.0",
  durum: null,          // bütün veri burada duruyor
  kurulumIstemi: null,  // tarayıcının "uygulamayı yükle" isteği (PWA)

  kaydet: function () {
    if (!Depolama.kaydet(Uygulama.durum)) {
      bildir("Veri kaydedilemedi. Tarayıcı depolaması kapalı ya da dolu olabilir.", "hata");
    }
  },

  // ekranı yeniden çizer ama sayfanın nerede olduğunu korur
  yenile: function () {
    const kaydirma = window.scrollY;
    sayfayiCiz();
    window.scrollTo(0, kaydirma);
  },

  // ---------- Çalışma kayıtları ----------

  // Elle eklerken dakika, sayaçtan eklerken saniye gelir (diğeri null olur)
  calismaEkle: function (dersId, dakika, tarih, saniye) {
    const d = Uygulama.durum;
    let ders = null;
    for (let i = 0; i < d.dersler.length; i++) {
      if (d.dersler[i].id === dersId) ders = d.dersler[i];
    }
    if (!ders) {
      bildir("Ders bulunamadı.", "hata");
      return;
    }

    // hedefin ne zaman tamamlandığını anlamak için eklemeden önceki değerleri alıyorum
    const bugun = Mantik.bugunMetni();
    const hedef = d.ayarlar.gunlukHedef;
    const oncekiToplam = Mantik.gunlukToplam(d.calismalar, bugun);
    const oncekiDersToplami = Mantik.gunlukToplam(d.calismalar, bugun, dersId);
    const oncekiSeri = Mantik.seriHesapla(d.calismalar, hedef, bugun).mevcut;

    const kayit = { id: Mantik.yeniKimlik(), dersId: dersId, tarih: tarih };
    const saniyeVar = Number.isInteger(saniye) && saniye > 0;
    if (saniyeVar) kayit.saniye = Math.min(EN_FAZLA_KAYIT_SANIYESI, saniye);
    else kayit.dakika = dakika;
    d.calismalar.push(kayit);
    Uygulama.kaydet();

    const sureMetni = saniyeVar ? Mantik.sureMetni(saniye / 60) : dakika + " dk";
    let mesaj = ders.ad + ": " + sureMetni + " kaydedildi.";

    const yeniToplam = Mantik.gunlukToplam(d.calismalar, bugun);
    const yeniDersToplami = Mantik.gunlukToplam(d.calismalar, bugun, dersId);
    if (hedef > 0 && oncekiToplam < hedef && yeniToplam >= hedef) {
      mesaj = "🎉 Bugünkü hedefini tamamladın!";
      const yeniSeri = Mantik.seriHesapla(d.calismalar, hedef, bugun).mevcut;
      if (yeniSeri > oncekiSeri) mesaj += " Serin " + yeniSeri + " gün oldu!";
    } else if (ders.gunlukHedef > 0 && oncekiDersToplami < ders.gunlukHedef && yeniDersToplami >= ders.gunlukHedef) {
      mesaj += " ✅ " + ders.ad + " hedefi tamam!";
    }
    bildir(mesaj, "basari");
    Uygulama.yenile();
  },

  calismaSil: function (id) {
    Uygulama.durum.calismalar = Uygulama.durum.calismalar.filter(function (c) {
      return c.id !== id;
    });
    Uygulama.kaydet();
    bildir("Kayıt silindi.");
    Uygulama.yenile();
  },

  // ---------- Dersler ----------

  // başarılıysa true döner (ekran ders adı kutusunu temizlesin diye)
  dersEkle: function (hamAd) {
    const ad = Mantik.dersAdiniDuzelt(hamAd);
    if (!ad) {
      bildir("Ders adı boş bırakılamaz.", "hata");
      return false;
    }
    if (Mantik.dersAdiKullanimda(Uygulama.durum.dersler, ad)) {
      bildir("Bu ders zaten kayıtlı.", "hata");
      return false;
    }

    Uygulama.durum.dersler.push({ id: Mantik.yeniKimlik(), ad: ad.slice(0, 40), gunlukHedef: 0 });
    Uygulama.kaydet();
    bildir(ad + " dersi eklendi.", "basari");
    Uygulama.yenile();
    return true;
  },

  dersGuncelle: function (id, hamAd, hedef) {
    const d = Uygulama.durum;
    let ders = null;
    for (let i = 0; i < d.dersler.length; i++) {
      if (d.dersler[i].id === id) ders = d.dersler[i];
    }
    if (!ders) return;

    const ad = Mantik.dersAdiniDuzelt(hamAd);
    if (!ad) {
      bildir("Ders adı boş bırakılamaz.", "hata");
      return;
    }
    if (Mantik.dersAdiKullanimda(d.dersler, ad, id)) {
      bildir("Bu adla başka bir ders var.", "hata");
      return;
    }
    if (!Number.isInteger(hedef) || hedef < 0 || hedef > 1440) {
      bildir("Hedef 0 ile 1440 dakika arasında olmalı.", "hata");
      return;
    }

    ders.ad = ad.slice(0, 40);
    ders.gunlukHedef = hedef;
    Uygulama.kaydet();
    bildir("Ders güncellendi.", "basari");
    Uygulama.yenile();
  },

  // dersi silince ona ait kayıtlar da silinir
  dersSil: function (id) {
    const d = Uygulama.durum;
    d.dersler = d.dersler.filter(function (x) { return x.id !== id; });
    d.calismalar = d.calismalar.filter(function (c) { return c.dersId !== id; });
    Uygulama.kaydet();
    bildir("Ders silindi.");
    Uygulama.yenile();
  },

  // ---------- Ayarlar ve veri ----------

  ayarlariKaydet: function (degisiklikler, mesaj) {
    Object.assign(Uygulama.durum.ayarlar, degisiklikler);
    Uygulama.kaydet();
    bildir(mesaj, "basari");
    Uygulama.yenile();
  },

  veriyiDegistir: function (yeniVeri) {
    Uygulama.durum = yeniVeri;
    Depolama.sayaciKaydet(null);
    Uygulama.kaydet();
    bildir("Yedek yüklendi.", "basari");
    Uygulama.yenile();
  },

  hepsiniSil: function () {
    Depolama.sil();
    Uygulama.durum = Mantik.varsayilanVeri(window.TEMA);
    bildir("Tüm veriler silindi.");
    Uygulama.yenile();
  }
};

// ---------- Sayfa geçişleri ----------

function suankiSayfa() {
  const ad = location.hash.replace("#/", "");
  if (SAYFALAR.includes(ad)) return ad;
  return "bugun";
}

function sayfayiCiz() {
  const sayfa = suankiSayfa();
  document.body.dataset.sayfa = sayfa; // css bunu kullanıyor
  Ekranlar.temizle();
  document.getElementById("icerik").replaceChildren(Ekranlar[sayfa]());

  // menüde açık olan sayfayı işaretle
  const baglantilar = document.querySelectorAll(".menu a");
  for (let i = 0; i < baglantilar.length; i++) {
    if (baglantilar[i].dataset.sayfa === sayfa) baglantilar[i].setAttribute("aria-current", "page");
    else baglantilar[i].removeAttribute("aria-current");
  }
}

// Temadaki ayarları sayfaya uygular (başlık, ana ekran görseli, menü simgesi, tarayıcı rengi)
function temayiUygula() {
  const tema = window.TEMA || {};
  if (tema.siteAdi) document.title = tema.siteAdi;

  // ana ekran görseli sadece temada varsa eklenir 
  if (tema.anaGorsel) {
    const hero = document.createElement("header");
    hero.className = "hero";
    const resim = document.createElement("img");
    resim.src = tema.anaGorsel;
    resim.alt = tema.siteAdi || "";
    if (tema.siteAdi && tema.heroAciklama) resim.alt = tema.siteAdi + ": " + tema.heroAciklama;
    hero.appendChild(resim);
    document.body.insertBefore(hero, document.querySelector(".menu"));
    document.body.classList.add("gorselli");
  }

  if (tema.menuSimgesi) {
    document.querySelector('.menu a[data-sayfa="bugun"] span').textContent = tema.menuSimgesi;
  }

  if (tema.tarayiciRengi) {
    let renk = tema.tarayiciRengi;
    if (typeof renk !== "string") {
      const koyuMu = window.matchMedia("(prefers-color-scheme: dark)").matches;
      renk = koyuMu ? renk.koyu : renk.acik;
    }
    document.querySelector('meta[name="theme-color"]').setAttribute("content", renk);
  }
}

function baslat() {
  temayiUygula();

  const yuklenen = Depolama.yukle();
  Uygulama.durum = yuklenen.veri;

  window.addEventListener("hashchange", function () {
    sayfayiCiz();
    window.scrollTo(0, 0);
  });
  window.addEventListener("beforeinstallprompt", function (olay) {
    olay.preventDefault();
    Uygulama.kurulumIstemi = olay;
  });

  sayfayiCiz();
  if (yuklenen.uyari) bildir(yuklenen.uyari, "hata");

  // çevrimdışı çalışma: sadece http/https'te çalışır (dosyaya çift tıklayınca çalışmaz)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js");
  }
}

baslat();
