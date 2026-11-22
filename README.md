# PulseEdu - BigBlueButton Web Portal

A clean, modern web management portal and meeting interface for BigBlueButton.

## Features

- **Host & Guest Portals**: One-click host access for administrators and invite links for guests with optional passcode protection.
- **Meeting Management**: Create, launch, monitor active rooms, and end live meetings.
- **Recordings**: View and playback session recordings generated through the portal.
- **Admin Accounts**: Administrator-only architecture with provision controls for the default administrator.
- **Modern UI**: Clean, responsive light interface built with Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Stateless encrypted JWT cookies (`jose` + `bcryptjs`)
- **Styling**: Tailwind CSS & Lucide Icons

## Getting Started

### 1. Environment Setup

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
SESSION_SECRET="your_long_random_session_secret_32_chars_minimum"
BIGBLUEBUTTON_URL="https://your-bbb-server.com/bigbluebutton/api"
BIGBLUEBUTTON_SECRET="your_bbb_shared_secret"
DEFAULT_ADMIN_EMAIL="admin@pulseedu.online"
DEFAULT_ADMIN_PASSWORD="your_secure_admin_password"
DEFAULT_ADMIN_NAME="Administrator"
NEXT_PUBLIC_APP_NAME="PulseEdu"
```

### 2. Install Dependencies & Setup Database

```bash
npm install
npx prisma db push
```

### 3. Provision Default Administrator

```bash
npm run create-admin -- --email=admin@pulseedu.online --password=YourSecurePassword --name="Administrator"
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:4444](http://localhost:4444) to access the dashboard.

## Available Scripts

- `npm run dev`: Starts local development server
- `npm run build`: Generates optimized production build
- `npm run start`: Runs production server
- `npm run create-admin`: Provisions an admin account via CLI
