import {
  PrismaClient,
  Role,
  ListType,
  Visibility,
  ContentType,
  Language,
  NotificationType,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Cinephiles geliştirme seed'i
// ---------------------------------------------------------------------------
// Uygulamayı gerçekçi göstermek için kullanıcı, içerik, inceleme, takip,
// beğeni, yorum, liste ve bildirim verisi üretir (her birinden 30+).
// Tüm kayıtlar `upsert` ile oluşturulur; seed tekrar çalıştırıldığında
// veri kopyalanmaz (idempotent). Çalıştırmak için: `pnpm --filter backend seed`
// ---------------------------------------------------------------------------

// TMDB tür (genre) id'leri — Content.genres alanı için
const G = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  drama: 18,
  fantasy: 14,
  horror: 27,
  mystery: 9648,
  romance: 10749,
  sciFi: 878,
  thriller: 53,
  war: 10752,
  // Dizi türleri
  actionAdventureTv: 10759,
  sciFiFantasyTv: 10765,
};

// Seed'lenen normal kullanıcıların ortak parolası: "user1234"
// (admin parolası: "admin123")

// Basit, deterministik bir seçici — index'e göre diziden döngüsel seçim yapar
const cyclic = <T>(arr: T[], i: number): T => arr[i % arr.length];

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user1234', 10);

  // -- ADMIN & DEMO (mevcut davranış korunur) --------------------------------
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cinephiles.dev' },
    update: {},
    create: {
      email: 'admin@cinephiles.dev',
      username: 'admin',
      passwordHash: adminHash,
      displayName: 'Admin',
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  const demo = await prisma.user.upsert({
    where: { email: 'demo@cinephiles.dev' },
    update: {},
    create: {
      email: 'demo@cinephiles.dev',
      username: 'demo',
      passwordHash: userHash,
      displayName: 'Demo Kullanıcı',
      bio: 'Sinemaya dair her şeyi seven biri.',
      location: 'İstanbul',
      emailVerified: true,
    },
  });

  // -- KULLANICILAR (30 adet) -----------------------------------------------
  const userSeed: { username: string; displayName: string; bio: string | null; location: string | null }[] = [
    { username: 'elifyilmaz', displayName: 'Elif Yılmaz', bio: 'Yeşilçam ve film noir tutkunu.', location: 'İstanbul' },
    { username: 'mertkaya', displayName: 'Mert Kaya', bio: 'Bilim kurgu ne kadar uçuksa o kadar iyi.', location: 'Ankara' },
    { username: 'zeynepdemir', displayName: 'Zeynep Demir', bio: 'Festival sineması ve belgesel.', location: 'İzmir' },
    { username: 'canpolat', displayName: 'Can Polat', bio: null, location: 'Bursa' },
    { username: 'ayseturk', displayName: 'Ayşe Türk', bio: 'Animasyon ve Studio Ghibli hayranı.', location: 'Antalya' },
    { username: 'emresahin', displayName: 'Emre Şahin', bio: 'Gerilim ve polisiye dizi maratoncusu.', location: 'İstanbul' },
    { username: 'selinaydin', displayName: 'Selin Aydın', bio: 'Romantik komediden utanmıyorum.', location: 'Eskişehir' },
    { username: 'burakdogan', displayName: 'Burak Doğan', bio: 'Nolan ve Villeneuve takipçisi.', location: 'Ankara' },
    { username: 'derinarslan', displayName: 'Derin Arslan', bio: null, location: 'İzmir' },
    { username: 'kerembulut', displayName: 'Kerem Bulut', bio: 'Korku filmlerini gündüz izlerim.', location: 'Adana' },
    { username: 'nazliozkan', displayName: 'Nazlı Özkan', bio: 'Kore sineması ve A24.', location: 'İstanbul' },
    { username: 'oguzkurt', displayName: 'Oğuz Kurt', bio: 'Klasik western koleksiyoncusu.', location: 'Kayseri' },
    { username: 'pelinacar', displayName: 'Pelin Acar', bio: 'Karakter draması her şeyden önce.', location: 'İzmir' },
    { username: 'tolgaersoy', displayName: 'Tolga Ersoy', bio: null, location: 'Gaziantep' },
    { username: 'irempolat', displayName: 'İrem Polat', bio: 'Müzikal ve dönem filmleri.', location: 'İstanbul' },
    { username: 'baranyildiz', displayName: 'Baran Yıldız', bio: 'Tarantino diyaloglarını ezberledim.', location: 'Ankara' },
    { username: 'ecekoc', displayName: 'Ece Koç', bio: 'Slow cinema ve uzun planlar.', location: 'Muğla' },
    { username: 'denizustun', displayName: 'Deniz Üstün', bio: 'Marvel ve gişe filmleri.', location: 'İstanbul' },
    { username: 'sevalgun', displayName: 'Seval Gün', bio: null, location: 'Trabzon' },
    { username: 'arasaksoy', displayName: 'Aras Aksoy', bio: 'Kült ve bağımsız yapımlar.', location: 'İzmir' },
    { username: 'gizemcetin', displayName: 'Gizem Çetin', bio: 'Dizi bağımlısı, özür dilemem.', location: 'Bursa' },
    { username: 'efekara', displayName: 'Efe Kara', bio: 'Kurosawa ve Japon sineması.', location: 'Ankara' },
    { username: 'melissoy', displayName: 'Melis Soy', bio: null, location: 'İstanbul' },
    { username: 'umutbas', displayName: 'Umut Baş', bio: 'Distopya ve siberpunk.', location: 'Konya' },
    { username: 'cemresari', displayName: 'Cemre Sarı', bio: 'Wes Anderson simetrisi.', location: 'İzmir' },
    { username: 'onuravci', displayName: 'Onur Avcı', bio: 'Spor ve biyografi filmleri.', location: 'Samsun' },
    { username: 'beriltas', displayName: 'Beril Taş', bio: 'Fantastik evrenlerde kaybolurum.', location: 'İstanbul' },
    { username: 'kaanozturk', displayName: 'Kaan Öztürk', bio: null, location: 'Ankara' },
    { username: 'yagmurkilic', displayName: 'Yağmur Kılıç', bio: 'Belgesel ve gerçek hikâyeler.', location: 'Antalya' },
    { username: 'sarpgunes', displayName: 'Sarp Güneş', bio: 'Suç draması ve antikahramanlar.', location: 'İstanbul' },
  ];

  const users = [];
  for (const u of userSeed) {
    const user = await prisma.user.upsert({
      where: { email: `${u.username}@cinephiles.dev` },
      update: {},
      create: {
        email: `${u.username}@cinephiles.dev`,
        username: u.username,
        passwordHash: userHash,
        displayName: u.displayName,
        bio: u.bio,
        location: u.location,
        language: Language.TR,
        emailVerified: true,
      },
    });
    users.push(user);
  }

  // -- İÇERİK (32 film/dizi, gerçek TMDB referansları) -----------------------
  // posterPath değerleri TMDB yollarıdır; frontend bunları görsele dönüştürür.
  const contentSeed: {
    tmdbId: number;
    type: ContentType;
    title: string;
    posterPath: string;
    releaseDate: string;
    genres: number[];
    tmdbRating: number;
    popularity: number;
  }[] = [
    { tmdbId: 550, type: ContentType.MOVIE, title: 'Fight Club', posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', releaseDate: '1999-10-15', genres: [G.drama], tmdbRating: 8.4, popularity: 70 },
    { tmdbId: 603, type: ContentType.MOVIE, title: 'The Matrix', posterPath: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', releaseDate: '1999-03-30', genres: [G.action, G.sciFi], tmdbRating: 8.2, popularity: 80 },
    { tmdbId: 27205, type: ContentType.MOVIE, title: 'Inception', posterPath: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', releaseDate: '2010-07-15', genres: [G.action, G.sciFi, G.adventure], tmdbRating: 8.4, popularity: 90 },
    { tmdbId: 157336, type: ContentType.MOVIE, title: 'Interstellar', posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', releaseDate: '2014-11-05', genres: [G.adventure, G.drama, G.sciFi], tmdbRating: 8.4, popularity: 110 },
    { tmdbId: 155, type: ContentType.MOVIE, title: 'The Dark Knight', posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', releaseDate: '2008-07-16', genres: [G.drama, G.action, G.crime, G.thriller], tmdbRating: 8.5, popularity: 95 },
    { tmdbId: 680, type: ContentType.MOVIE, title: 'Pulp Fiction', posterPath: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', releaseDate: '1994-09-10', genres: [G.thriller, G.crime], tmdbRating: 8.5, popularity: 75 },
    { tmdbId: 13, type: ContentType.MOVIE, title: 'Forrest Gump', posterPath: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', releaseDate: '1994-06-23', genres: [G.comedy, G.drama, G.romance], tmdbRating: 8.5, popularity: 78 },
    { tmdbId: 278, type: ContentType.MOVIE, title: 'The Shawshank Redemption', posterPath: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', releaseDate: '1994-09-23', genres: [G.drama, G.crime], tmdbRating: 8.7, popularity: 88 },
    { tmdbId: 238, type: ContentType.MOVIE, title: 'The Godfather', posterPath: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', releaseDate: '1972-03-14', genres: [G.drama, G.crime], tmdbRating: 8.7, popularity: 92 },
    { tmdbId: 496243, type: ContentType.MOVIE, title: 'Parasite', posterPath: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', releaseDate: '2019-05-30', genres: [G.comedy, G.thriller, G.drama], tmdbRating: 8.5, popularity: 85 },
    { tmdbId: 129, type: ContentType.MOVIE, title: 'Spirited Away', posterPath: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', releaseDate: '2001-07-20', genres: [G.animation, G.fantasy, G.adventure], tmdbRating: 8.5, popularity: 82 },
    { tmdbId: 244786, type: ContentType.MOVIE, title: 'Whiplash', posterPath: '/7fn624j5lj3xTme2SgiLCeuedmO.jpg', releaseDate: '2014-10-10', genres: [G.drama], tmdbRating: 8.4, popularity: 65 },
    { tmdbId: 475557, type: ContentType.MOVIE, title: 'Joker', posterPath: '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', releaseDate: '2019-10-01', genres: [G.crime, G.thriller, G.drama], tmdbRating: 8.1, popularity: 100 },
    { tmdbId: 438631, type: ContentType.MOVIE, title: 'Dune', posterPath: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', releaseDate: '2021-09-15', genres: [G.sciFi, G.adventure], tmdbRating: 7.8, popularity: 120 },
    { tmdbId: 872585, type: ContentType.MOVIE, title: 'Oppenheimer', posterPath: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', releaseDate: '2023-07-19', genres: [G.drama, G.war], tmdbRating: 8.1, popularity: 130 },
    { tmdbId: 545611, type: ContentType.MOVIE, title: 'Everything Everywhere All at Once', posterPath: '/w3LxiVYdWZjEj8VeDdkAfsoNdrz.jpg', releaseDate: '2022-03-24', genres: [G.action, G.adventure, G.sciFi], tmdbRating: 7.9, popularity: 75 },
    { tmdbId: 769, type: ContentType.MOVIE, title: 'GoodFellas', posterPath: '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg', releaseDate: '1990-09-12', genres: [G.drama, G.crime], tmdbRating: 8.5, popularity: 60 },
    { tmdbId: 122, type: ContentType.MOVIE, title: 'The Lord of the Rings: The Return of the King', posterPath: '/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg', releaseDate: '2003-12-01', genres: [G.adventure, G.fantasy, G.action], tmdbRating: 8.5, popularity: 98 },
    { tmdbId: 424, type: ContentType.MOVIE, title: "Schindler's List", posterPath: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', releaseDate: '1993-12-15', genres: [G.drama, G.war], tmdbRating: 8.6, popularity: 55 },
    { tmdbId: 311, type: ContentType.MOVIE, title: 'Once Upon a Time in America', posterPath: '/i0enkzsL5dPeneWnjl1fCWm6L7k.jpg', releaseDate: '1984-05-23', genres: [G.drama, G.crime], tmdbRating: 8.4, popularity: 40 },
    { tmdbId: 1396, type: ContentType.TV, title: 'Breaking Bad', posterPath: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', releaseDate: '2008-01-20', genres: [G.drama, G.crime], tmdbRating: 8.9, popularity: 200 },
    { tmdbId: 1399, type: ContentType.TV, title: 'Game of Thrones', posterPath: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', releaseDate: '2011-04-17', genres: [G.sciFiFantasyTv, G.drama, G.actionAdventureTv], tmdbRating: 8.4, popularity: 180 },
    { tmdbId: 66732, type: ContentType.TV, title: 'Stranger Things', posterPath: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', releaseDate: '2016-07-15', genres: [G.drama, G.sciFiFantasyTv, G.mystery], tmdbRating: 8.6, popularity: 220 },
    { tmdbId: 2316, type: ContentType.TV, title: 'The Office', posterPath: '/7DJKHzAi83BmQrWLrYYOqcoKfhR.jpg', releaseDate: '2005-03-24', genres: [G.comedy], tmdbRating: 8.6, popularity: 160 },
    { tmdbId: 87108, type: ContentType.TV, title: 'Chernobyl', posterPath: '/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg', releaseDate: '2019-05-06', genres: [G.drama], tmdbRating: 8.6, popularity: 90 },
    { tmdbId: 60059, type: ContentType.TV, title: 'Better Call Saul', posterPath: '/fC2HDm5t0kHl7mTm7jxMR31b7by.jpg', releaseDate: '2015-02-08', genres: [G.crime, G.drama], tmdbRating: 8.7, popularity: 95 },
    { tmdbId: 1668, type: ContentType.TV, title: 'Friends', posterPath: '/f496cm9enuEsZkSPzCwnTESEK5s.jpg', releaseDate: '1994-09-22', genres: [G.comedy], tmdbRating: 8.5, popularity: 150 },
    { tmdbId: 94605, type: ContentType.TV, title: 'Arcane', posterPath: '/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg', releaseDate: '2021-11-06', genres: [G.animation, G.sciFiFantasyTv, G.actionAdventureTv], tmdbRating: 8.7, popularity: 140 },
    { tmdbId: 76479, type: ContentType.TV, title: 'The Boys', posterPath: '/stTEycfG9928HYGEISBFaG1ngjM.jpg', releaseDate: '2019-07-25', genres: [G.sciFiFantasyTv, G.actionAdventureTv], tmdbRating: 8.4, popularity: 170 },
    { tmdbId: 456, type: ContentType.TV, title: 'The Simpsons', posterPath: '/qcr9bBY6MVeLzriKCmJOv1562uY.jpg', releaseDate: '1989-12-17', genres: [G.comedy, G.animation], tmdbRating: 8.0, popularity: 130 },
    { tmdbId: 71912, type: ContentType.TV, title: 'The Witcher', posterPath: '/7vjaCdMw15FEbXyLQTVa04URsPm.jpg', releaseDate: '2019-12-20', genres: [G.sciFiFantasyTv, G.actionAdventureTv, G.drama], tmdbRating: 7.8, popularity: 160 },
  ];

  const contents = [];
  for (const c of contentSeed) {
    const content = await prisma.content.upsert({
      where: { tmdbId_type: { tmdbId: c.tmdbId, type: c.type } },
      update: {},
      create: {
        tmdbId: c.tmdbId,
        type: c.type,
        title: c.title,
        originalTitle: c.title,
        posterPath: c.posterPath,
        releaseDate: new Date(c.releaseDate),
        genres: c.genres,
        tmdbRating: c.tmdbRating,
        popularity: c.popularity,
      },
    });
    contents.push(content);
  }

  // -- İNCELEMELER (her kullanıcı 2 içerik → 60+ inceleme) --------------------
  const reviewBodies = [
    'Yıllar sonra tekrar izledim ve hâlâ aynı etkiyi yaratıyor. Kesinlikle başyapıt.',
    'Görsel anlamda kusursuz ama senaryo ortalarda biraz dağılıyor. Yine de tavsiye ederim.',
    'Oyunculuklar olağanüstü. Özellikle final sahnesi uzun süre aklımdan çıkmadı.',
    'Beklentim yüksekti, biraz hayal kırıklığı yaşadım. Belki ikinci izlemede oturur.',
    'Atmosferi muhteşem. Müzikler hikâyeyi bambaşka bir yere taşıyor.',
    'Temposu yer yer yavaş ama sabredene değer veriyor. Son yarım saat her şeyi telafi ediyor.',
    'Tam bir duygu sömürüsü ama itiraf etmeliyim ki işe yarıyor, ağladım.',
    'Senaryo zekice kurgulanmış. Her detayın bir karşılığı var, ikinci izlemede daha çok seveceksiniz.',
    'Tür sevenler için bayram. Klişelerden de tamamen kaçamamış ama keyifli.',
    'Yönetmenliği bir ders niteliğinde. Kamera kullanımı tek başına izlenmeye değer.',
    'Karakter gelişimi çok başarılı. Sonunda herkesle empati kurabiliyorsunuz.',
    'Biraz fazla uzun olmuş, 20 dakika kısa olsa şaheser derdim. Yine de güçlü.',
    'Diyaloglar kült olmuş, replikleri günlük hayatta kullanıyorum.',
    'Görsel efektler çağının çok ötesinde. Bugün bile çoğu yapımı geride bırakıyor.',
    'İlk yarısı kusursuz, ikinci yarısı tartışılır. Yine de unutulmaz anları var.',
  ];

  const reviewers = [demo, ...users]; // 31 kişi
  const reviews = [];
  for (let i = 0; i < reviewers.length; i++) {
    const u = reviewers[i];
    for (let k = 0; k < 2; k++) {
      const content = cyclic(contents, i * 2 + k);
      // Puanı 3.0 - 5.0 arasında 0.5 adımlı, deterministik dağıt
      const rating = 3 + ((i + k) % 5) * 0.5;
      // İncelemeleri geçmişe yay (son ~20 gün) — feed'de gerçekçi "x gün önce" görünsün
      const seq = i * 2 + k;
      const hoursAgo = seq * 7 + (seq % 5) * 11;
      const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      const review = await prisma.review.upsert({
        where: { userId_contentId: { userId: u.id, contentId: content.id } },
        update: { createdAt },
        create: {
          userId: u.id,
          contentId: content.id,
          rating,
          body: cyclic(reviewBodies, i + k),
          containsSpoiler: (i + k) % 7 === 0, // her ~7'de bir spoiler işaretli
          createdAt,
        },
      });
      reviews.push(review);
    }
  }

  // -- TAKİPLER (her kullanıcı kendinden sonraki 4 kişiyi takip eder) ---------
  const social = [admin, demo, ...users]; // 32 kişi
  let followCount = 0;
  for (let i = 0; i < social.length; i++) {
    for (let step = 1; step <= 4; step++) {
      const target = cyclic(social, i + step);
      if (target.id === social[i].id) continue; // kendini takip etme
      await prisma.follow.upsert({
        where: {
          followerId_followingId: { followerId: social[i].id, followingId: target.id },
        },
        update: {},
        create: { followerId: social[i].id, followingId: target.id },
      });
      followCount++;
    }
  }

  // -- İNCELEME BEĞENİLERİ (her inceleme birkaç kişi tarafından beğenilir) ----
  let likeCount = 0;
  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];
    for (let step = 1; step <= 5; step++) {
      const liker = cyclic(social, i + step * 3);
      if (liker.id === review.userId) continue; // kendi incelemeni beğenme
      await prisma.reviewLike.upsert({
        where: { reviewId_userId: { reviewId: review.id, userId: liker.id } },
        update: {},
        create: { reviewId: review.id, userId: liker.id },
      });
      likeCount++;
    }
  }

  // -- İNCELEME YORUMLARI (ilk 40 incelemeye 1-2 yorum) ----------------------
  const commentBodies = [
    'Tam da benim düşündüğüm gibi yazmışsın, katılıyorum.',
    'Bence biraz abartmışsın ama saygı duyuyorum 😄',
    'Bunu izleme listeme ekledim, teşekkürler!',
    'Final hakkında aynı şeyleri hissetmiştim.',
    'Yönetmenin diğer filmlerini de denemelisin.',
    'Spoiler vermeden çok güzel anlatmışsın.',
    'Katılmıyorum, bence en zayıf işlerinden biriydi.',
    'Müzikler için ayrı bir paragraf hak ediyordu.',
  ];
  let commentSeq = 0;
  for (let i = 0; i < Math.min(reviews.length, 40); i++) {
    const review = reviews[i];
    const commentNum = 1 + (i % 2); // bazısına 1, bazısına 2 yorum
    for (let c = 0; c < commentNum; c++) {
      const author = cyclic(social, i + c + 1);
      if (author.id === review.userId) continue;
      await prisma.reviewComment.upsert({
        where: { id: `seed-cmt-${commentSeq}` },
        update: {},
        create: {
          id: `seed-cmt-${commentSeq}`,
          reviewId: review.id,
          userId: author.id,
          body: cyclic(commentBodies, i + c),
        },
      });
      commentSeq++;
    }
  }

  // -- LİSTELER + ÖĞELERİ ----------------------------------------------------
  // a) Her kullanıcıya 3 sistem listesi (İzlenenler/İzleme Listesi/Favoriler), herkese açık.
  //    Kayıt (register) davranışıyla birebir; böylece her kullanıcının watchlist'i olur ve
  //    profilden erişilebilir.
  const allUsers = [admin, demo, ...users];
  for (const u of allUsers) {
    for (const type of [ListType.WATCHED, ListType.WATCHLIST, ListType.FAVORITES] as const) {
      await prisma.list.upsert({
        where: { id: `${u.id}-${type}` },
        update: { visibility: Visibility.PUBLIC },
        create: { id: `${u.id}-${type}`, userId: u.id, type, title: type, visibility: Visibility.PUBLIC },
      });
    }
  }

  // b) Her kullanıcıya herkese açık bir favoriler listesi (+ 5 içerik) → 31 liste
  // Sistem FAVORITES listesiyle çakışmasın diye CUSTOM tip kullanıyoruz.
  let listCount = 0;
  let listItemCount = 0;
  const lists = [];
  for (let i = 0; i < reviewers.length; i++) {
    const u = reviewers[i];
    const listId = `seed-fav-${u.id}`;
    const list = await prisma.list.upsert({
      where: { id: listId },
      update: {},
      create: {
        id: listId,
        userId: u.id,
        type: ListType.CUSTOM,
        title: 'Tüm Zamanların Favorileri',
        description: 'Defalarca izlemekten bıkmadığım yapımlar.',
        visibility: Visibility.PUBLIC,
      },
    });
    lists.push(list);
    listCount++;

    // Listeye 5 içerik ekle
    for (let p = 0; p < 5; p++) {
      const content = cyclic(contents, i + p);
      await prisma.listItem.upsert({
        where: { listId_contentId: { listId: list.id, contentId: content.id } },
        update: {},
        create: { listId: list.id, contentId: content.id, position: p },
      });
      listItemCount++;
    }
  }

  // c) Birkaç tematik CUSTOM liste
  const customLists = [
    { slug: 'bilim-kurgu', owner: users[1], title: 'Sıkı Bilim Kurgu', picks: [1, 2, 3, 13, 14] },
    { slug: 'suc-draması', owner: users[28], title: 'En İyi Suç Dramaları', picks: [5, 6, 8, 16, 20] },
    { slug: 'animasyon', owner: users[4], title: 'Yetişkinler İçin Animasyon', picks: [10, 27, 29] },
    { slug: 'dizi-maratonu', owner: users[20], title: 'Hafta Sonu Dizi Maratonu', picks: [20, 22, 25, 28] },
  ];
  for (const cl of customLists) {
    const listId = `seed-list-${cl.slug}`;
    const list = await prisma.list.upsert({
      where: { id: listId },
      update: {},
      create: {
        id: listId,
        userId: cl.owner.id,
        type: ListType.CUSTOM,
        title: cl.title,
        visibility: Visibility.PUBLIC,
      },
    });
    lists.push(list);
    listCount++;
    let pos = 0;
    for (const idx of cl.picks) {
      const content = contents[idx % contents.length];
      await prisma.listItem.upsert({
        where: { listId_contentId: { listId: list.id, contentId: content.id } },
        update: {},
        create: { listId: list.id, contentId: content.id, position: pos++ },
      });
      listItemCount++;
    }
  }

  // -- LİSTE BEĞENİLERİ ------------------------------------------------------
  let listLikeCount = 0;
  for (let i = 0; i < lists.length; i++) {
    for (let step = 1; step <= 3; step++) {
      const liker = cyclic(social, i + step * 4);
      if (liker.id === lists[i].userId) continue;
      await prisma.listLike.upsert({
        where: { listId_userId: { listId: lists[i].id, userId: liker.id } },
        update: {},
        create: { listId: lists[i].id, userId: liker.id },
      });
      listLikeCount++;
    }
  }

  // -- BİLDİRİMLER (yeni takipçi örnekleri) ----------------------------------
  let notifCount = 0;
  for (let i = 0; i < social.length; i++) {
    const recipient = social[i];
    const actor = cyclic(social, i + 1);
    if (actor.id === recipient.id) continue;
    await prisma.notification.upsert({
      where: { id: `seed-notif-${i}` },
      update: {},
      create: {
        id: `seed-notif-${i}`,
        recipientId: recipient.id,
        actorId: actor.id,
        type: NotificationType.NEW_FOLLOWER,
        entityType: 'user',
        entityId: actor.id,
        isRead: i % 3 === 0,
      },
    });
    notifCount++;
  }

  console.warn(
    [
      'Seed tamam ·',
      `kullanıcı: ${social.length} (admin: ${admin.email}, demo: ${demo.email})`,
      `içerik: ${contents.length}`,
      `inceleme: ${reviews.length}`,
      `takip: ${followCount}`,
      `beğeni: ${likeCount}`,
      `yorum: ${commentSeq}`,
      `liste: ${listCount} (öğe: ${listItemCount})`,
      `liste beğenisi: ${listLikeCount}`,
      `bildirim: ${notifCount}`,
    ].join('\n  '),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
