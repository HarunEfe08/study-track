"""Uçtan uca tarayıcı testi. Çalıştırmak için (proje klasöründe):
    python3 test/tarayici_testi.py
Gerekenler: pip install playwright && playwright install chromium"""
import json
import os
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CIKTI = os.environ.get("EKRAN_KLASORU", os.path.join(KOK, "test", "ekranlar"))
PORT = 8765
ADRES = f"http://localhost:{PORT}/index.html"
os.makedirs(CIKTI, exist_ok=True)

hatalar = []
sonuclar = []


def kontrol(ad, kosul, ayrinti=""):
    sonuclar.append((ad, bool(kosul)))
    print(("  ✓ " if kosul else "  ✗ ") + ad + (f"  [{ayrinti}]" if ayrinti and not kosul else ""))


sunucu = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
                          cwd=KOK, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)


def sayfa_ac(tarayici, genislik, yukseklik, ad):
    baglam = tarayici.new_context(viewport={"width": genislik, "height": yukseklik}, locale="tr-TR",
                                  timezone_id="Europe/Istanbul", accept_downloads=True)
    # Dış ağ (Google Fonts) sandbox'ta yok; engelle ki sayfa beklemesin
    baglam.route("**/*", lambda r: r.continue_() if r.request.url.startswith(f"http://localhost:{PORT}") else r.abort())
    sayfa = baglam.new_page()
    sayfa.on("pageerror", lambda e: hatalar.append(f"[{ad}] pageerror: {e}"))
    sayfa.on("console", lambda m: hatalar.append(f"[{ad}] console.{m.type}: {m.text}")
             if m.type == "error" and "Failed to load resource" not in m.text and "ERR_FAILED" not in m.text else None)
    return baglam, sayfa


def toast(sayfa):
    sayfa.wait_for_selector("#bildirimAlani .bildirim")
    return sayfa.locator("#bildirimAlani .bildirim").last.inner_text()


def git(sayfa, ad):
    sayfa.click(f'.menu a[data-sayfa="{ad}"]')
    sayfa.wait_for_timeout(150)


try:
    with sync_playwright() as p:
        chromium_yolu = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH")
        tarayici = p.chromium.launch(executable_path=chromium_yolu) if chromium_yolu else p.chromium.launch()

        # ================= MASAÜSTÜ =================
        baglam, s = sayfa_ac(tarayici, 1280, 900, "masaüstü")
        s.goto(ADRES, wait_until="domcontentloaded")
        s.wait_for_selector("h1")
        print("Açılış")
        tema = s.evaluate("window.TEMA")
        ad0 = tema.get("varsayilanAd", "")
        kontrol("karşılama yazısı", s.inner_text("h1").startswith("Hoş geldin" + (f", {ad0}" if ad0 else "")), s.inner_text("h1"))
        kontrol("sayfa başlığı tema adı", s.title() == tema["siteAdi"], s.title())
        if tema.get("anaGorsel"):
            kontrol("hero görseli yüklendi", s.evaluate("document.querySelector('.hero img').naturalWidth") > 0)
            kontrol("hero alt metni dolu", len(s.get_attribute(".hero img", "alt") or "") > 10)
        else:
            kontrol("görselsiz temada hero yok", s.locator(".hero").count() == 0 and s.locator("img").count() == 0)
        kontrol("ilk kullanım kartı görünüyor", s.locator("h2", has_text="Hızlı başlangıç").count() == 1)
        s.screenshot(path=f"{CIKTI}/00-masaustu-ilk.png")
        s.screenshot(path=f"{CIKTI}/01-masaustu-bos.png")

        print("Dersler")
        git(s, "dersler")
        for ad in ["Mat", "Anatomi", "Python"]:
            s.fill('input[aria-label="Yeni ders adı"]', ad)
            s.click('button:has-text("Ekle")')
            s.wait_for_timeout(100)
        kontrol("3 ders eklendi", s.locator(".ders-satiri").count() == 3, str(s.locator(".ders-satiri").count()))
        s.fill('input[aria-label="Yeni ders adı"]', "ANATOMİ")
        s.click('button:has-text("Ekle")')
        kontrol("Türkçe büyük harfle kopya engellendi", "zaten kayıtlı" in toast(s), toast(s))
        s.fill('input[aria-label="Yeni ders adı"]', "<img src=x onerror=window.__xss=1>")
        s.click('button:has-text("Ekle")')
        s.wait_for_timeout(200)
        kontrol("XSS denemesi çalışmadı", s.evaluate("window.__xss") is None)
        kontrol("zararlı metin düz yazı olarak görünüyor", s.locator(".ders-bilgi strong", has_text="<img").count() == 1)
        s.click('button[aria-label="<img src=x onerror=window.__xss=1> dersini sil"]')
        s.click("#onayEvetDugmesi")
        s.wait_for_timeout(150)
        kontrol("ders silindi", s.locator(".ders-satiri").count() == 3)

        s.click('button[aria-label="Mat dersini düzenle"]')
        s.fill("#fk-1", "15")
        s.click('#formKutusu button[value="tamam"]')
        s.wait_for_timeout(150)
        kontrol("ders hedefi kaydedildi", "günlük hedef 15 dk" in s.inner_text("main"))

        print("Ayarlar")
        git(s, "ayarlar")
        s.fill("#aSaat", "1")
        s.fill("#aDakika", "30")
        s.click('button:has-text("Hedefi kaydet")')
        kontrol("günlük hedef kaydedildi", "kaydedildi" in toast(s))
        s.fill("#aAd", "Deniz")
        s.click('form:has(#aAd) button[type="submit"]')
        if tema.get("temaSecimi"):
            s.click('[data-tema-secimi="koyu"]')
            kontrol("Koyu seçilince tema koyu oluyor", s.evaluate("document.documentElement.dataset.tema") == "koyu")
            koyu_zemin = s.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--zemin').trim()")
            s.click('[data-tema-secimi="acik"]')
            acik_zemin = s.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--zemin').trim()")
            kontrol("Açık ve koyu zemin rengi farklı", koyu_zemin != acik_zemin, koyu_zemin + " / " + acik_zemin)
            s.reload()
            s.wait_for_selector("h1")
            kontrol("Tema seçimi yenilemeden sonra kalıyor", s.evaluate("document.documentElement.dataset.tema") == "acik")
            s.click('.menu a[data-sayfa="ayarlar"]')
            s.click('[data-tema-secimi="otomatik"]')
            kontrol("Otomatik seçilince özellik kalkıyor", s.evaluate("document.documentElement.dataset.tema") is None)
        s.wait_for_timeout(200)
        s.screenshot(path=f"{CIKTI}/02-masaustu-ayarlar.png", full_page=True)

        print("Bugün: kayıt ekleme ve seri")
        git(s, "bugun")
        kontrol("karşılama yazısı girilen adı kullanıyor", "Hoş geldin, Deniz" in s.inner_text("h1"), s.inner_text("h1"))
        s.select_option("#cDers", label="Mat")
        s.fill("#cDakika", "20")
        s.click("main form button[type=submit]")
        kontrol("kayıt bildirimi", "Mat: 20 dk kaydedildi" in toast(s), toast(s))
        kontrol("ders hedefi tamamlandı mesajı", "Mat hedefi tamam" in toast(s), toast(s))
        s.select_option("#cDers", label="Anatomi")
        s.fill("#cDakika", "80")
        s.click("main form button[type=submit]")
        kontrol("günlük hedef tamamlandı", "hedefini tamamladın" in toast(s), toast(s))
        # Dün ve evvelsi gün (seri için)
        bugun = s.evaluate("Mantik.bugunMetni()")
        dun = s.evaluate("Mantik.gunEkle(Mantik.bugunMetni(), -1)")
        evvelsi = s.evaluate("Mantik.gunEkle(Mantik.bugunMetni(), -2)")
        for tarih, dk in [(dun, 90), (evvelsi, 95)]:
            s.fill("#cDakika", str(dk))
            s.fill("#cTarih", tarih)
            s.click("main form button[type=submit]")
            s.wait_for_timeout(150)
        kontrol("seri 3 gün", "Seri: 3 gün" in s.inner_text("main"), s.inner_text(".cipler"))
        kontrol("rozet görünüyor", "Güzel gidiyorsun" in s.inner_text("main"))
        kayit_sayisi = s.evaluate("Uygulama.durum.calismalar.length")
        s.fill("#cDakika", "5")
        s.fill("#cTarih", "2099-01-01")
        s.click("main form button[type=submit]")  # tarayıcının max doğrulaması engellemeli
        s.wait_for_timeout(200)
        kontrol("gelecek tarih reddedildi", s.evaluate("Uygulama.durum.calismalar.length") == kayit_sayisi)
        s.screenshot(path=f"{CIKTI}/03-masaustu-bugun.png", full_page=True)

        print("Geçmiş ve silme")
        git(s, "gecmis")
        sayi_once = s.locator(".kayit-satiri").count()
        s.locator('button[aria-label*="kaydı sil"]').first.click()
        s.click("#onayEvetDugmesi")
        s.wait_for_timeout(150)
        kontrol("kayıt silindi", s.locator(".kayit-satiri").count() == sayi_once - 1, f"{sayi_once} -> {s.locator('.kayit-satiri').count()}")
        # vazgeç ve Esc: silmemeli
        sayi_once = s.locator(".kayit-satiri").count()
        s.locator('button[aria-label*="kaydı sil"]').first.click()
        s.keyboard.press("Escape")
        s.wait_for_timeout(150)
        kontrol("Esc ile kapatınca silinmedi", s.locator(".kayit-satiri").count() == sayi_once)
        s.screenshot(path=f"{CIKTI}/04-masaustu-gecmis.png", full_page=True)

        print("Rapor")
        git(s, "rapor")
        kontrol("rapor grafiği çizildi", s.locator(".sutun-grubu").count() == 7)
        kontrol("haftalık mesaj var", len(s.inner_text(".ilerleme-mesaj")) > 10)
        s.screenshot(path=f"{CIKTI}/05-masaustu-rapor.png", full_page=True)

        print("Kalıcılık ve yedek")
        s.reload()
        s.wait_for_selector("h1")
        git(s, "bugun")
        kontrol("yenileyince veri durdu", "Seri:" in s.inner_text("main"))
        # Bugünün Anatomi 80 dk kaydı silinmişti: bugün hedefin altında, ama dünkü seri (2 gün) korunmalı
        kontrol("kayıt silince seri yeniden hesaplandı (2 gün)", "Seri: 2 gün" in s.inner_text(".cipler"), s.inner_text(".cipler"))
        git(s, "ayarlar")
        with s.expect_download() as indirme:
            s.click('button:has-text("Yedek indir")')
        yol = indirme.value.path()
        yedek = json.load(open(yol, encoding="utf-8"))
        kontrol("yedek dosyası içeriği doğru", len(yedek["dersler"]) == 3 and len(yedek["calismalar"]) >= 3)
        s.click('button:has-text("Tüm verileri sil")')
        s.click("#onayEvetDugmesi")
        s.wait_for_timeout(200)
        git(s, "dersler")
        kontrol("tüm veriler silindi", s.locator(".ders-satiri").count() == 0)
        git(s, "ayarlar")
        s.set_input_files('input[type="file"]', yol)
        s.wait_for_selector("#onayKutusu[open]")
        s.click("#onayEvetDugmesi")
        s.wait_for_timeout(200)
        git(s, "dersler")
        kontrol("yedekten geri yüklendi", s.locator(".ders-satiri").count() == 3)
        bozuk = os.path.join(CIKTI, "bozuk.json")
        open(bozuk, "w").write("{bu json degil")
        git(s, "ayarlar")
        s.set_input_files('input[type="file"]', bozuk)
        kontrol("bozuk yedek reddedildi", "geçerli bir yedek değil" in toast(s), toast(s))

        print("Sayaç")
        git(s, "bugun")
        baslangic = s.evaluate("Date.now()") - 5 * 60 * 1000
        ders_id = s.evaluate("Uygulama.durum.dersler[0].id")
        s.evaluate(f"localStorage.setItem('studytrack:sayac', JSON.stringify({{baslangic:{baslangic}, dersId:'{ders_id}'}}))")
        s.reload()
        s.wait_for_selector(".sayac-zaman")
        kontrol("sayaç yenilemeden sonra devam ediyor", s.inner_text(".sayac-zaman").startswith("00:05"), s.inner_text(".sayac-zaman"))
        s.click('button:has-text("Bitir ve kaydet")')
        kontrol("sayaç 5 dakikalık kayıt ekledi", "5 dk kaydedildi" in toast(s), toast(s))
        kontrol("sayaç sıfırlandı", s.locator('button:has-text("Sayacı başlat")').count() == 1)
        s.click('button:has-text("Sayacı başlat")')
        s.click('button:has-text("Bitir ve kaydet")')
        kontrol("30 sn'den kısa sayaç kaydedilmedi", "kaydedilmedi" in toast(s), toast(s))

        # 31 saniye, 1 dakikaya yuvarlanmamalı; tam saniye olarak kaydedilmeli.
        baslangic = s.evaluate("Date.now()") - 31 * 1000
        ders_id = s.evaluate("Uygulama.durum.dersler[0].id")
        s.evaluate(f"localStorage.setItem('studytrack:sayac', JSON.stringify({{baslangic:{baslangic}, dersId:'{ders_id}'}}))")
        s.reload()
        s.wait_for_selector(".sayac-zaman")
        # Sayfa yüklenme süresinin saniye hesabını etkilememesi için saati sabitle.
        s.evaluate(f"window.__gercekDateNow = Date.now; Date.now = () => {baslangic} + 31000")
        s.click('button:has-text("Bitir ve kaydet")')
        s.evaluate("Date.now = window.__gercekDateNow")
        kontrol("31 saniye 31 saniye olarak kaydedildi", "31 sn kaydedildi" in toast(s), toast(s))
        kontrol("sayaç kaydı saniye değerini saklıyor", s.evaluate("Uygulama.durum.calismalar.some(k => k.saniye === 31)"))

        # Sayaç durdurulup devam ettirilince duraklanan süre tekrar sayılmamalı.
        baslangic = s.evaluate("Date.now()") - 40 * 1000
        ders_id = s.evaluate("Uygulama.durum.dersler[0].id")
        s.evaluate(f"localStorage.setItem('studytrack:sayac', JSON.stringify({{baslangic:{baslangic}, dersId:'{ders_id}'}}))")
        s.reload()
        s.wait_for_selector(".sayac-zaman")
        s.evaluate(f"window.__gercekDateNow = Date.now; Date.now = () => {baslangic} + 40000")
        s.click('button:has-text("Durdur")')
        duraklatilmis = s.evaluate("JSON.parse(localStorage.getItem('studytrack:sayac'))")
        kontrol("Durdur butonu sayacı duraklatıyor", duraklatilmis.get("baslangic") is None and duraklatilmis.get("birikenMs") == 40000)
        kontrol("durdurunca Devam et butonu görünüyor", s.locator('button:has-text("Devam et")').count() == 1)
        s.click('button:has-text("Devam et")')
        s.evaluate(f"Date.now = () => {baslangic} + 55000")
        s.click('button:has-text("Durdur")')
        kontrol("devam edince süre birikimli ilerliyor", s.inner_text(".sayac-zaman") == "00:00:55", s.inner_text(".sayac-zaman"))
        s.click('button:has-text("Bitir ve kaydet")')
        s.evaluate("Date.now = window.__gercekDateNow")
        kontrol("duraklatılan sayaç toplam 55 saniye kaydediyor", "55 sn kaydedildi" in toast(s), toast(s))

        print("Service worker")
        s.wait_for_timeout(800)
        kontrol("service worker kayıtlı", s.evaluate("navigator.serviceWorker.getRegistration().then(r => !!r)"))
        baglam.close()

        # ================= TELEFON =================
        baglam, m = sayfa_ac(tarayici, 390, 844, "telefon")
        m.goto(ADRES, wait_until="domcontentloaded")
        m.wait_for_selector("h1")
        print("Telefon görünümü")
        kontrol("yatay kaydırma yok", m.evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
                str(m.evaluate("document.documentElement.scrollWidth")))
        kutu = m.locator(".menu").bounding_box()
        kontrol("menü ekranın altında", kutu["y"] + kutu["height"] >= 840, str(kutu))
        m.screenshot(path=f"{CIKTI}/06-telefon-bos.png")
        # veriyle
        m.evaluate("""(() => {
          const d = Uygulama.durum;
          d.ayarlar.gunlukHedef = 90;
          d.dersler.push({id:'a', ad:'Anatomi', gunlukHedef:30}, {id:'b', ad:'Python', gunlukHedef:0});
          const t = Mantik.bugunMetni();
          d.calismalar.push({id:'1', dersId:'a', dakika:45, tarih:t}, {id:'2', dersId:'b', dakika:30, tarih:t},
            {id:'3', dersId:'a', dakika:90, tarih:Mantik.gunEkle(t,-1)}, {id:'4', dersId:'b', dakika:60, tarih:Mantik.gunEkle(t,-2)});
          Uygulama.kaydet(); Uygulama.yenile();
        })()""")
        m.wait_for_timeout(300)
        m.screenshot(path=f"{CIKTI}/07-telefon-bugun.png", full_page=True)
        m.click('.menu a[data-sayfa="rapor"]')
        m.wait_for_timeout(300)
        kontrol("telefonda rapor yatay taşmıyor", m.evaluate("document.documentElement.scrollWidth <= window.innerWidth"))
        m.screenshot(path=f"{CIKTI}/08-telefon-rapor.png", full_page=True)
        m.click('.menu a[data-sayfa="dersler"]')
        m.wait_for_timeout(200)
        m.screenshot(path=f"{CIKTI}/09-telefon-dersler.png", full_page=True)
        baglam.close()
        tarayici.close()
finally:
    sunucu.terminate()

print()
print("HATA/UYARI (konsol):", hatalar if hatalar else "yok")
basarisiz = [ad for ad, ok in sonuclar if not ok]
print(f"{len(sonuclar) - len(basarisiz)}/{len(sonuclar)} kontrol geçti")
sys.exit(1 if basarisiz or hatalar else 0)
