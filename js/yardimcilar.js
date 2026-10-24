// Ekranlarda ortak kullandığım küçük fonksiyonlar.
function el(etiket, ozellikler, ...cocuklar) {
  const e = document.createElement(etiket);
  ozellikleriAyarla(e, ozellikler);
  cocuklariEkle(e, cocuklar);
  return e;
}

function svgEl(etiket, ozellikler, ...cocuklar) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", etiket);
  ozellikleriAyarla(e, ozellikler);
  cocuklariEkle(e, cocuklar);
  return e;
}

function ozellikleriAyarla(e, ozellikler) {
  if (!ozellikler) return;
  for (const ad in ozellikler) {
    const deger = ozellikler[ad];
    if (deger === null || deger === undefined || deger === false) continue;

    if (ad === "sinif") {
      e.setAttribute("class", deger);
    } else if (ad.startsWith("on") && typeof deger === "function") {
      // onClick -> click
      e.addEventListener(ad.slice(2).toLowerCase(), deger);
    } else if (deger === true) {
      e.setAttribute(ad, "");
    } else {
      e.setAttribute(ad, String(deger));
    }
  }
}

function cocuklariEkle(e, cocuklar) {
  for (const c of cocuklar) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) cocuklariEkle(e, c); // liste verilirse içindekileri ekle
    else if (typeof c === "object") e.append(c);
    else e.append(document.createTextNode(String(c)));
  }
}

// ---------- Bildirim ----------

function bildir(mesaj, tur) {
  const alan = document.getElementById("bildirimAlani");
  const kutu = el("div", { sinif: "bildirim " + (tur || ""), role: "status" }, mesaj);
  alan.replaceChildren(kutu); // aynı anda tek bildirim görünüyor
  setTimeout(function () { kutu.remove(); }, 3500);
}

// ---------- Onay kutusu ----------
// kullanım: if (await onayla("Silinsin mi?", "Evet, sil")) { ... }

function onayla(mesaj, evetYazisi) {
  return new Promise(function (coz) {
    const kutu = document.getElementById("onayKutusu");
    document.getElementById("onayMetni").textContent = mesaj;
    document.getElementById("onayEvetDugmesi").textContent = evetYazisi || "Evet";
    kutu.returnValue = ""; // Esc ile kapanırsa eski değer kalmasın
    kutu.addEventListener("close", function () {
      coz(kutu.returnValue === "evet");
    }, { once: true });
    kutu.showModal();
  });
}

// ---------- Form kutusu ----------
// formKutusu({ baslik: "...", alanlar: [{ ad, etiket, tur, deger, min, max, zorunlu, uzunluk }] })
// Kaydet'e basılırsa { ad: "değer" } döner, vazgeçilirse null.

function formKutusu(ayar) {
  return new Promise(function (coz) {
    const kutu = document.getElementById("formKutusu");
    document.getElementById("formKutusuBaslik").textContent = ayar.baslik;
    const alanKabi = document.getElementById("formKutusuAlanlar");
    alanKabi.replaceChildren();

    const girdiler = {};
    for (let i = 0; i < ayar.alanlar.length; i++) {
      const alan = ayar.alanlar[i];
      const kimlik = "fk-" + i;
      const girdi = el("input", {
        id: kimlik, name: alan.ad, type: alan.tur || "text",
        value: alan.deger === undefined ? "" : alan.deger,
        min: alan.min, max: alan.max, maxlength: alan.uzunluk, required: alan.zorunlu,
        autocomplete: "off"
      });
      girdiler[alan.ad] = girdi;
      alanKabi.append(el("div", { sinif: "alan" }, el("label", { for: kimlik }, alan.etiket), girdi));
    }

    kutu.returnValue = "";
    kutu.addEventListener("close", function () {
      if (kutu.returnValue !== "tamam") {
        coz(null);
        return;
      }
      const sonuc = {};
      for (const ad in girdiler) sonuc[ad] = girdiler[ad].value;
      coz(sonuc);
    }, { once: true });

    kutu.showModal();
    girdiler[ayar.alanlar[0].ad].focus();
  });
}

// ---------- Biçimlendirme ----------

function tarihiGoster(metin, uzun) {
  const tarih = Mantik.metniTariheCevir(metin);
  let secenekler = { day: "numeric", month: "short" };
  if (uzun) secenekler = { day: "numeric", month: "long", year: "numeric", weekday: "long" };
  return new Intl.DateTimeFormat("tr-TR", secenekler).format(tarih);
}

function dosyaIndir(dosyaAdi, metin) {
  const adres = URL.createObjectURL(new Blob([metin], { type: "application/json" }));
  const baglanti = el("a", { href: adres, download: dosyaAdi });
  document.body.append(baglanti);
  baglanti.click();
  baglanti.remove();
  setTimeout(function () { URL.revokeObjectURL(adres); }, 1000);
}

// ---------- Görsel parçalar ----------

// Bugünkü ilerleme halkası 
function ilerlemeHalkasi(oran, ustYazi, altYazi) {
  const boyut = 188;
  const kalinlik = 16;
  const yaricap = (boyut - kalinlik) / 2;
  const cevre = 2 * Math.PI * yaricap;
  const dolu = Math.min(Math.max(oran, 0), 1); // 0 ile 1 arasında kalsın

  const svg = svgEl("svg", {
    viewBox: "0 0 " + boyut + " " + boyut, width: boyut, height: boyut, class: "halka", "aria-hidden": "true"
  },
    svgEl("defs", {},
      svgEl("linearGradient", { id: "halkaRenk", x1: "0", y1: "0", x2: "1", y2: "1" },
        svgEl("stop", { offset: "0%", style: "stop-color: var(--halka-1)" }),
        svgEl("stop", { offset: "100%", style: "stop-color: var(--halka-2)" }))),
    svgEl("circle", { cx: boyut / 2, cy: boyut / 2, r: yaricap, class: "halka-iz", "stroke-width": kalinlik, fill: "none" }),
    svgEl("circle", {
      cx: boyut / 2, cy: boyut / 2, r: yaricap, class: "halka-dolu", "stroke-width": kalinlik, fill: "none",
      "stroke-linecap": "round", stroke: "url(#halkaRenk)",
      "stroke-dasharray": cevre, "stroke-dashoffset": cevre * (1 - dolu),
      transform: "rotate(-90 " + boyut / 2 + " " + boyut / 2 + ")"
    }));

  return el("div", { sinif: "halka-kabi" }, svg,
    el("div", { sinif: "halka-yazi" }, el("strong", {}, ustYazi), el("span", {}, altYazi)));
}

// Yatay ilerleme çubuğu
function cubuk(oran, sinif) {
  const yuzde = Math.min(Math.max(oran, 0), 1) * 100;
  return el("div", { sinif: "cubuk " + (sinif || ""), "aria-hidden": "true" },
    el("div", { sinif: "cubuk-dolu", style: "width:" + yuzde.toFixed(1) + "%" }));
}
