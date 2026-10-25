# 📚 Study Track

**Study Track**, ders çalışma sürecini daha düzenli ve takip edilebilir hâle getirmek amacıyla geliştirdiğim bir çalışma takip uygulamasıdır.

Çalışma sürelerini kaydetmek, günlük hedefler belirlemek, ilerlemeyi gözlemlemek ve ders çalışma alışkanlığını sürdürülebilir hâle getirmek için tasarlandı. Projeyi geliştirirken yalnızca çalışan bir uygulama ortaya çıkarmayı değil, aynı zamanda yazılım geliştirme sürecinde yeni şeyler öğrenmeyi ve öğrendiklerimi pratiğe dökmeyi de hedefledim.

🌐 **Canlı demo:** https://harunefe08.github.io/study-track/

## ✨ Neler Yapabiliyor?

- 📖 **Ders yönetimi:** Ders ekleme, düzenleme ve silme.
- ⏱️ **Çalışma sayacı:** Çalışmayı başlatma, duraklatma ve devam ettirme.
- 🎯 **Günlük hedefler:** Çalışma hedefleri belirleme ve ilerlemeyi takip etme.
- 📊 **İstatistikler:** Çalışma sürelerini ve ders bazlı ilerlemeyi görüntüleme.
- 🔥 **Seri takibi:** Art arda çalışılan günleri takip etme.
- 🗓️ **Çalışma geçmişi:** Önceki çalışma kayıtlarını görüntüleme ve yönetme.
- 💾 **Veri yedekleme:** Kayıtları dışa aktarma ve gerektiğinde geri yükleme.
- 🎨 **Tema seçenekleri:** Açık ve koyu tema desteği.
- 📱 **PWA desteği:** Uygun tarayıcı ve cihazlarda uygulama olarak yükleyebilme.
- 🌐 **Çevrimdışı kullanım:** Service Worker desteğiyle temel uygulama kaynaklarına çevrimdışı erişim.

## 🛠️ Kullanılan Teknolojiler

- HTML5
- CSS3
- JavaScript (Vanilla JS)
- LocalStorage
- Progressive Web App (PWA)
- Service Worker
- Node.js ile mantık testleri
- Python ve Playwright ile tarayıcı testleri

## 🚀 Nasıl Çalıştırılır?

Projeyi bilgisayarına indir veya GitHub üzerinden klonla:

```bash
git clone https://github.com/HarunEfe08/study-track.git
cd study-track
```

Python kuruluysa proje klasöründe aşağıdaki komutu çalıştırabilirsin:

```bash
python -m http.server 8000
```

Ardından tarayıcıdan şu adresi aç:

http://localhost:8000

> Not: PWA ve çevrimdışı kullanım özelliklerinin doğru çalışması için uygulamanın yerel bir sunucu üzerinden açılması önerilir.

## 🧪 Testler

Uygulamanın temel iş mantığını kontrol etmek için testler de projeye dâhil edilmiştir.

Node.js kuruluysa mantık testlerini şu komutla çalıştırabilirsin:

```bash
node test/mantik.test.js
```

Tarayıcı testlerini çalıştırmak için Python ve Playwright kurulumu gerekir:

```bash
pip install playwright
playwright install chromium
python test/tarayici_testi.py
```

## 🔒 Veri Gizliliği

Study Track, çalışma kayıtlarını kullanıcının tarayıcısındaki LocalStorage alanında saklar. Uygulama, mevcut yapısıyla kullanıcı hesabı veya merkezi bir veritabanı gerektirmez.

- Veriler varsayılan olarak kullanılan tarayıcıda saklanır.
- Farklı cihazlar arasında otomatik veri senkronizasyonu bulunmaz.
- Tarayıcı verilerinin silinmesi kayıtların kaybolmasına neden olabilir.
- Önemli kayıtların yedeklenmesi önerilir.

## 🤝 Geliştirme Süreci ve Yapay Zekâ Kullanımı

Study Track'i geliştirirken tasarım, uygulama mantığı, özelliklerin iyileştirilmesi ve hata ayıklama gibi farklı aşamalar üzerinde çalıştım.

Bu süreçte bazı konularda fikir almak, alternatif çözümleri değerlendirmek, karşılaştığım hataları anlamak ve kod üzerinde iyileştirmeler yapmak amacıyla yapay zekâ araçlarından destek aldım. Bununla birlikte, projenin tamamını yapay zekâya hazırlatmak yerine geliştirme sürecine kendim de aktif olarak katıldım; özellikleri değerlendirdim, değişiklikler yaptım.

Benim için bu proje yalnızca bir uygulama değil, aynı zamanda öğrendiklerimi pekiştirdiğim ve yazılım geliştirme becerilerimi ilerlettiğim bir öğrenme süreci oldu.

## 🎯 Projenin Amacı

Study Track'in temel amacı, ders çalışmayı daha planlı hâle getirmek ve kişinin kendi ilerlemesini görebilmesini sağlamaktır. Projeyi zaman içinde geliştirerek daha kullanışlı, sürdürülebilir ve ihtiyaçlara uyum sağlayan bir uygulamaya dönüştürmeyi hedefliyorum.

## 📄 Lisans

Bu proje için henüz bir açık kaynak lisansı belirlenmemiştir.

---

**Study Track üzerinde çalışmaya ve onu geliştirmeye devam ediyorum.** 🚀
