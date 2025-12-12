# ![SmartBank API](https://raw.githubusercontent.com/zidanindratama/fe-predictive-lead-scoring/refs/heads/main/app/og-image.png)

# 🧠 SmartBank - Predictive Lead Scoring API

**SmartBank Backend API** is a NestJS + Prisma (MongoDB) backend for the **Predictive Lead Scoring System**.  
It provides modules for **Auth, Users, Customers, Predictions, Campaigns, Analytics**, and integrates with **Cloudinary, ML Service, and SMTP Mail**.

---

## 🌐 API Base URL

- **Production / Demo:** `https://be-predictive-lead-scoring.vercel.app`
- **Development:** `http://localhost:5000`

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
| Mail           | Nodemailer (SMTP Gmail)                |
| Security       | Helmet, Cookie-Parser                  |
| Utility        | DayJS, Bcrypt                          |

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run server (dev mode)
npm run start:dev

# (Optional) Seed database
npm run seed

# Production mode
npm run build && npm run start:prod
```

Server runs at: [http://localhost:5000](http://localhost:5000)

---

## 🔧 Environment Variables

Create `.env` in the root folder:

```env
DATABASE_URL="mongodb+srv://<user>:<pass>@cluster.mongodb.net/dbname"
NODE_ENV=development
PORT=5000

JWT_ACCESS_SECRET=changeme
JWT_REFRESH_SECRET=changeme
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

ML_BASE_URL=https://A25-CS078-Banking-Sales-Predictor.hf.space
ML_API_KEY=your-ml-api-key

CLOUDINARY_CLOUD_NAME="cloudname"
CLOUDINARY_API_KEY="apikey"
CLOUDINARY_API_SECRET="apisecret"

COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=your-email@gmail.com
```

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
 ├── common/        # Guards, Pipes, Interceptors, Utils
 ├── config/        # Environment & app config
 └── prisma/        # PrismaService (Global)
```

---

## 🔐 Authentication Module

| Method | Path             | Roles         | Description                  |
| ------ | ---------------- | ------------- | ---------------------------- |
| POST   | `/auth/register` | Public        | Register new user            |
| POST   | `/auth/login`    | Public        | Login user & set `rt` cookie |
| POST   | `/auth/refresh`  | Refresh Token | Refresh access token         |
| DELETE | `/auth/logout`   | Auth          | Remove refresh cookie        |
| GET    | `/auth/me`       | Auth          | Get logged-in user info      |
| PATCH  | `/auth/me`       | Auth          | Update profile               |

**Notes:**

- **Access Token** is sent via `Authorization: Bearer <token>`
- **Refresh Token** is stored in `rt` cookie
- Default role for new user = `USER`

---

## 👥 Users Module

| Method | Path         | Roles | Description                               |
| ------ | ------------ | ----- | ----------------------------------------- |
| GET    | `/users`     | ADMIN | List all users (with filter & pagination) |
| GET    | `/users/:id` | ADMIN | Get user details                          |
| PATCH  | `/users/:id` | ADMIN | Update name, role, avatar                 |
| DELETE | `/users/:id` | ADMIN | Delete user                               |

**Query params:** `page`, `limit`, `q`, `role`, `sortBy`, `sortDir`, `from`, `to`

---

## 👤 Customers Module

| Method | Path                     | Roles        | Description                                  |
| ------ | ------------------------ | ------------ | -------------------------------------------- |
| GET    | `/customers`             | ALL          | List customers (filter/search/sort/paginate) |
| GET    | `/customers/:id`         | ALL          | Customer details                             |
| POST   | `/customers`             | ADMIN, STAFF | Add new customer                             |
| PATCH  | `/customers/:id`         | ADMIN, STAFF | Update customer data                         |
| DELETE | `/customers/:id`         | ADMIN        | Delete customer                              |
| POST   | `/customers/import`      | ADMIN, STAFF | Import CSV / XLSX                            |
| GET    | `/customers/export.csv`  | ADMIN, STAFF | Export to CSV                                |
| GET    | `/customers/export.xlsx` | ADMIN, STAFF | Export to XLSX                               |

**Filter support:** `job`, `marital`, `education`, `contact`, `ageMin`, `ageMax`, `q`, `from`, `to`

---

## 🔮 Predictions Module

| Method | Path                  | Roles | Description                    |
| ------ | --------------------- | ----- | ------------------------------ |
| GET    | `/predictions`        | ALL   | List predictions (with filter) |
| GET    | `/predictions/:id`    | ALL   | Prediction details             |
| PATCH  | `/predictions/:id`    | ALL   | Update probability/class       |
| DELETE | `/predictions/:id`    | ALL   | Delete prediction              |
| POST   | `/predictions/single` | ALL   | Predict 1 customer via ML API  |

**Filter Query:** `predictedClass`, `source`, `customerId`, `probYesMin/Max`, `probNoMin/Max`, `from`, `to`

---

## 🎯 Campaigns Module

| Method | Path                 | Roles        | Description                           |
| ------ | -------------------- | ------------ | ------------------------------------- |
| POST   | `/campaigns`         | ADMIN, STAFF | Create new campaign                   |
| POST   | `/campaigns/:id/run` | ADMIN, STAFF | Run campaign & save predictions       |
| GET    | `/campaigns`         | ALL          | List campaigns (search/sort/paginate) |
| GET    | `/campaigns/:id`     | ALL          | Campaign details                      |
| PATCH  | `/campaigns/:id`     | ADMIN, STAFF | Update name/criteria                  |
| DELETE | `/campaigns/:id`     | ADMIN        | Delete campaign & related predictions |

**Payload Example:**

```json
{
  "name": "October Campaign",
  "criteria": {
    "job": "technician",
    "month": "oct",
    "age": { "gte": 25, "lte": 40 }
  },
  "recompute": true
}
```

---

## 📊 Analytics Module

| Method | Path                  | Roles | Description                                                      |
| ------ | --------------------- | ----- | ---------------------------------------------------------------- |
| GET    | `/analytics/overview` | ALL   | Get total customers, YES/NO predictions, and campaigns summary   |
| GET    | `/analytics/trend`    | ALL   | Get prediction trends graph (group by `day`, `week`, or `month`) |
| GET    | `/analytics/by-job`   | ALL   | Get distribution of predictions by job category                  |

---

## ☁️ Uploads Module (Cloudinary)

| Method | Path             | Roles | Description                                       |
| ------ | ---------------- | ----- | ------------------------------------------------- |
| POST   | `/uploads/image` | ALL   | Upload image (multipart/form-data, field: `file`) |

**Response Example:**

```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/...jpg",
    "publicId": "uploads/xyz123"
  }
}
```

---

## 🧠 ML Integration

- **Environment variable:** `ML_BASE_URL` → ML service endpoint
- **ML API Key:** `ML_API_KEY`
- Used in: `POST /predictions/single` and `POST /campaigns/:id/run`
- Send numerical + categorical features (job, marital, etc.) → Receive:

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

## 📧 SMTP Mail Integration

- **Environment variables:** `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`
- Used for sending notifications, campaign summaries, or system alerts.

---

## 📦 Standard Response Format

✅ Success:

```json
{
  "success": true,
  "data": { "id": "abc123", "name": "October Campaign" }
}
```

❌ Error:

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

## 🧰 Dev Commands

| Command              | Description                         |
| -------------------- | ----------------------------------- |
| `npm run start:dev`  | Run server in dev mode (watch)      |
| `npm run build`      | Build project to `dist`             |
| `npm run start:prod` | Run production server               |
| `npm run lint`       | Fix code format (ESLint + Prettier) |
| `npm run seed`       | Seed database                       |
| `npm run test`       | Run unit tests (Jest)               |

---

## 👥 Development Team

- **Alexander Brian Susanto** - React & Backend with AI (Binus University)
- **Nur Bintang Hidayat** - Machine Learning (Gunadarma University)
- **Muhamad Zidan Indratama** - React & Backend with AI (Gunadarma University)
- **Muhamad Rafli Kamal** - Machine Learning (Politeknik Enjinering Indorama)
- **Ilham Maulana** - React & Backend with AI (Gunadarma University)

---

## 📚 Tips

- Store `accessToken` in frontend memory or cookie; keep `refreshToken` in HTTP-only cookie.
- Use headers:

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

- All modules accessible at base URL:

```
https://be-predictive-lead-scoring.vercel.app/
```
