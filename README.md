# 🧠 Predictive Lead Scoring API

> Backend API untuk sistem **Predictive Lead Scoring** berbasis **NestJS + Prisma (MongoDB)**
> Menyediakan modul **Auth, Users, Customers, Predictions, Campaigns, Analytics**, serta integrasi **Cloudinary & ML Service**.

---

## ⚙️ Tech Stack

| Layer          | Tools / Library                        |
| -------------- | -------------------------------------- |
| Framework      | NestJS 10                              |
| ORM / DB       | Prisma 5 + MongoDB                     |
| Auth           | JWT (Access & Refresh), Passport Local |
| Validation     | Zod + Custom Pipe                      |
| Storage        | Cloudinary (Image Upload)              |
| ML Integration | Axios → HuggingFace Space API          |
| Import/Export  | Papaparse (CSV), XLSX                  |
| Security       | Helmet, Cookie-Parser                  |
| Utility        | DayJS, Bcrypt                          |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Jalankan server (dev mode)
npm run start:dev

# 4. (Opsional) Seed database
npm run seed

# 5. Production
npm run build && npm run start:prod
```

Server berjalan di: **[http://localhost:5000](http://localhost:5000)**

---

## 📁 Folder Structure

```
src/
 ├── auth/          # Login, Register, Refresh, Me
 ├── users/         # Admin user management
 ├── customers/     # CRUD + import/export
 ├── predictions/   # ML predictions
 ├── campaigns/     # Campaign management + ML batch run
 ├── analytics/     # Overview, trend, by-job
 ├── uploads/       # Cloudinary upload
 ├── common/        # guards, pipes, interceptors, utils
 ├── config/        # environment configs
 └── prisma/        # PrismaService (Global)
```

---

## 🔧 Environment Setup

Buat file `.env`:

```env
DATABASE_URL="mongodb+srv://<user>:<pass>@cluster.mongodb.net/dbname"
NODE_ENV=development
PORT=5000

JWT_ACCESS_SECRET=changeme
JWT_REFRESH_SECRET=changeme
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

ML_BASE_URL=https://your-ml-service.hf.space

CLOUDINARY_CLOUD_NAME="cloudname"
CLOUDINARY_API_KEY="apikey"
CLOUDINARY_API_SECRET="apisecret"

COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
```

---

## 🧩 Global Response Format

| Status     | Format                                            |
| ---------- | ------------------------------------------------- |
| ✅ Success | `{ "success": true, "data": ... }`                |
| ❌ Error   | `{ "success": false, "error": { message, ... } }` |

---

## 🔐 Authentication Module

### Endpoint Table

| Method | Path             | Roles         | Deskripsi                 |
| ------ | ---------------- | ------------- | ------------------------- |
| POST   | `/auth/register` | Public        | Register user baru        |
| POST   | `/auth/login`    | Public        | Login dan set cookie `rt` |
| POST   | `/auth/refresh`  | Refresh Token | Refresh access token      |
| DELETE | `/auth/logout`   | Auth          | Hapus cookie refresh      |
| GET    | `/auth/me`       | Auth          | Dapatkan info user login  |
| PATCH  | `/auth/me`       | Auth          | Update profil user        |

### Catatan

- **Access Token** dikirim via `Authorization: Bearer <token>`
- **Refresh Token** disimpan di cookie `rt`
- Role default user baru = `USER`

---

## 👥 Users Module

| Method | Path         | Roles | Deskripsi                                    |
| ------ | ------------ | ----- | -------------------------------------------- |
| GET    | `/users`     | ADMIN | List semua user (dengan filter & pagination) |
| GET    | `/users/:id` | ADMIN | Detail user                                  |
| PATCH  | `/users/:id` | ADMIN | Update nama, role, atau avatar               |
| DELETE | `/users/:id` | ADMIN | Hapus user                                   |

**Query params:**
`page`, `limit`, `q`, `role`, `sortBy`, `sortDir`, `from`, `to`

---

## 👤 Customers Module

| Method | Path                     | Roles        | Deskripsi                                      |
| ------ | ------------------------ | ------------ | ---------------------------------------------- |
| GET    | `/customers`             | ALL          | List customer (filter, search, sort, paginate) |
| GET    | `/customers/:id`         | ALL          | Detail customer                                |
| POST   | `/customers`             | ADMIN, STAFF | Tambah customer baru                           |
| PATCH  | `/customers/:id`         | ADMIN, STAFF | Update data customer                           |
| DELETE | `/customers/:id`         | ADMIN        | Hapus customer                                 |
| POST   | `/customers/import`      | ADMIN, STAFF | Import CSV / XLSX                              |
| GET    | `/customers/export.csv`  | ADMIN, STAFF | Export ke CSV                                  |
| GET    | `/customers/export.xlsx` | ADMIN, STAFF | Export ke XLSX                                 |

**Filter support:**
`job`, `marital`, `education`, `contact`, `ageMin`, `ageMax`, `q`, `from`, `to`

---

## 🔮 Predictions Module

| Method | Path                  | Roles | Deskripsi                       |
| ------ | --------------------- | ----- | ------------------------------- |
| GET    | `/predictions`        | ALL   | List prediction (dengan filter) |
| GET    | `/predictions/:id`    | ALL   | Detail prediction               |
| PATCH  | `/predictions/:id`    | ALL   | Update probability/class        |
| DELETE | `/predictions/:id`    | ALL   | Hapus prediction                |
| POST   | `/predictions/single` | ALL   | Prediksi 1 customer via ML API  |

**Filter Query:**
`predictedClass`, `source`, `customerId`, `probYesMin/Max`, `probNoMin/Max`, `from`, `to`

---

## 🎯 Campaigns Module

| Method | Path                 | Roles        | Deskripsi                                 |
| ------ | -------------------- | ------------ | ----------------------------------------- |
| POST   | `/campaigns`         | ADMIN, STAFF | Buat campaign baru                        |
| POST   | `/campaigns/:id/run` | ADMIN, STAFF | Jalankan campaign & simpan hasil prediksi |
| GET    | `/campaigns`         | ALL          | List campaign (search/sort/paginate)      |
| GET    | `/campaigns/:id`     | ALL          | Detail campaign                           |
| PATCH  | `/campaigns/:id`     | ADMIN, STAFF | Update nama/criteria campaign             |
| DELETE | `/campaigns/:id`     | ADMIN        | Hapus campaign + predictions terkait      |

### Payload

| Field       | Type    | Deskripsi                                      |
| ----------- | ------- | ---------------------------------------------- |
| `name`      | string  | Nama campaign                                  |
| `criteria`  | JSON    | Prisma where filter untuk Customer             |
| `recompute` | boolean | (PATCH) Rehitung ulang counter, default `true` |

**Contoh criteria:**

```json
{ "job": "technician", "month": "oct", "age": { "gte": 25, "lte": 40 } }
```

---

## 📊 Analytics Module

| Method | Path                          | Roles | Deskripsi                                                 |     |                      |
| ------ | ----------------------------- | ----- | --------------------------------------------------------- | --- | -------------------- |
| GET    | `/analytics/overview`         | ALL   | Total customer, jumlah prediksi (YES/NO), jumlah campaign |     |                      |
| GET    | `/analytics/trend?groupBy=day | week  | month`                                                    | ALL | Grafik tren prediksi |
| GET    | `/analytics/by-job`           | ALL   | Distribusi hasil prediksi berdasarkan pekerjaan           |     |                      |

---

## ☁️ Uploads Module (Cloudinary)

| Method | Path             | Roles | Deskripsi                                         |
| ------ | ---------------- | ----- | ------------------------------------------------- |
| POST   | `/uploads/image` | ALL   | Upload image (multipart/form-data, field: `file`) |

**Respons:**

```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/...jpg",
    "publicId": "inventory/xyz123"
  }
}
```

---

## 🧠 ML Integration (Service)

Set environment `ML_BASE_URL` ke endpoint model, misal:

```
https://A25-CS078-Banking-Sales-Predictor.hf.space
```

Used in:

- `POST /predictions/single`
- `POST /campaigns/:id/run`

Body dikirim ke ML API: fitur numerik + kategorikal (job, marital, dsb) → menerima hasil:

```json
{
  "data": {
    "predicted_class": "YES",
    "probability_yes": 0.82,
    "probability_no": 0.18
  }
}
```

---

## 📦 Standard Response Example

✅ **Sukses**

```json
{
  "success": true,
  "data": { "id": "abc123", "name": "Oct Campaign" }
}
```

❌ **Error**

```json
{
  "success": false,
  "path": "/campaigns",
  "error": {
    "message": "Validation failed",
    "issues": [{ "path": "name", "message": "Required" }]
  }
}
```

---

## 🧰 Dev Tools

| Command              | Deskripsi                                |
| -------------------- | ---------------------------------------- |
| `npm run start:dev`  | Jalankan server dev (watch mode)         |
| `npm run build`      | Build project ke folder `dist`           |
| `npm run start:prod` | Jalankan versi produksi                  |
| `npm run lint`       | Perbaiki format kode (ESLint + Prettier) |
| `npm run seed`       | Jalankan seeder database                 |
| `npm run test`       | Jalankan unit test (Jest)                |

---

## 🧾 License & Credits

**License:** Private repository – for internal **Capstone Project** use only.
© 2025 — Developed by:

| Name                        | GitHub                                                         |
| --------------------------- | -------------------------------------------------------------- |
| **Muhamad Zidan Indratama** | [github.com/zidanindratama](https://github.com/zidanindratama) |
| **Ilham Maulana**           | [github.com/ilhmlnaa](https://github.com/ilhmlnaa)             |

---

## 📚 Tips

- Simpan `accessToken` di FE (React/NextJS) memory atau cookie; biarkan `refreshToken` tetap di HTTP-only cookie.
- Gunakan header:

  ```
  Authorization: Bearer <accessToken>
  Content-Type: application/json
  ```

- Semua modul bisa diakses di base URL:

  ```
  https://be-predictive-lead-scoring.vercel.app/
  ```
