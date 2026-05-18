# SineFiles

> Sosyal Film/Dizi İnceleme Platformu - TMDB destekli, tam yığın sinema topluluğu.

## Nedir?

SineFiles, kullanıcıların film ve dizileri keşfettiği, puanladığı, inceleme yazdığı
ve koleksiyon listeleri oluşturduğu Letterboxd benzeri bir sosyal sinema platformudur.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Backend** | Node.js, Express, TypeScript, Prisma (PostgreSQL), Redis |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Query, Zustand |
| **Auth** | JWT (access + refresh), bcrypt, rate limiting |
| **Veri** | TMDB API (Redis cache), Zod doğrulama |
| **i18n** | i18next (TR/EN) |

## Proje Yapısı

```
SineFiles/
├── backend/             # Express REST API + Prisma ORM
├── frontend/            # Vite + React SPA
├── docker-compose.yml   # PostgreSQL + Redis
└── README.md
```

## Hızlı Başlangıç

### 1. Ön gereksinimler
- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### 2. Veritabanı ve Redis'i başlat
```bash
docker compose up -d
```

### 3. Backend
```bash
cd backend
cp .env.example .env      # TMDB_API_KEY ve JWT secret'ları doldur
pnpm install
pnpm prisma migrate dev --name init
pnpm dev                  # http://localhost:4000
```

### 4. Frontend
```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev                  # http://localhost:5173
```

## Komutlar

### Backend
| Komut | Açıklama |
|-------|----------|
| `pnpm dev` | Geliştirme sunucusu (tsx watch) |
| `pnpm build` | TypeScript derleme |
| `pnpm start` | Üretim çalıştırma |
| `pnpm prisma:studio` | Prisma Studio (veritabanı görüntüleyici) |

### Frontend
| Komut | Açıklama |
|-------|----------|
| `pnpm dev` | Vite dev server |
| `pnpm build` | Üretim build |
| `pnpm preview` | Build önizleme |