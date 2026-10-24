// Verileri tarayıcının localStorage'ında tutuyoruz. Hepsi tek anahtarda duruyor,
// böylece yedek almak ve yüklemek kolay oluyor.

const ANAHTAR = "studytrack:veri";
const SAYAC_ANAHTARI = "studytrack:sayac";

const Depolama = {
  // Kayıtlı veriyi getirir. Yoksa boş veri verir.
  // Veri bozuksa silmeden "bozuk" adıyla yedekler.
  yukle: function () {
    const tema = window.TEMA;
    let ham = null;
    try {
      ham = localStorage.getItem(ANAHTAR);
    } catch (e) {
      ham = null;
    }
    if (!ham) return { veri: Mantik.varsayilanVeri(tema), uyari: "" };

    try {
      const sonuc = Mantik.veriyiDogrula(JSON.parse(ham), tema);
      if (sonuc) {
        let uyari = "";
        if (sonuc.atilan > 0) uyari = sonuc.atilan + " bozuk kayıt temizlendi.";
        return { veri: sonuc.veri, uyari: uyari };
      }
    } catch (e) {
      // JSON bozuk,
    }

    try {
      localStorage.setItem(ANAHTAR + ".bozuk", ham);
    } catch (e) {
      // yer yoksa yapacak bir şey yok
    }
    return { veri: Mantik.varsayilanVeri(tema), uyari: "Kayıtlı veri okunamadı, bozuk kopya yedeklendi." };
  },

  kaydet: function (veri) {
    try {
      localStorage.setItem(ANAHTAR, JSON.stringify(veri));
      return true;
    } catch (e) {
      return false;
    }
  },

  sil: function () {
    try {
      localStorage.removeItem(ANAHTAR);
      localStorage.removeItem(SAYAC_ANAHTARI);
    } catch (e) {
      // önemli değil
    }
  },

  // Sayaç sayfa yenilense de devam etsin diye ayrı bir anahtarda duruyor.
  // baslangic null ise sayaç duraklatılmış demek.
  sayaciOku: function () {
    try {
      const s = JSON.parse(localStorage.getItem(SAYAC_ANAHTARI));
      if (!s || typeof s.dersId !== "string") return null;
      if (s.baslangic !== null && typeof s.baslangic !== "number") return null;
      if (s.birikenMs !== undefined && typeof s.birikenMs !== "number") return null;
      return s;
    } catch (e) {
      return null;
    }
  },

  sayaciKaydet: function (sayac) {
    try {
      if (sayac) localStorage.setItem(SAYAC_ANAHTARI, JSON.stringify(sayac));
      else localStorage.removeItem(SAYAC_ANAHTARI);
    } catch (e) {
      
    }
  }
};
