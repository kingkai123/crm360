# CRM360 — SaaS Customer Relationship Management Platform

CRM360 is a comprehensive, modern SaaS Customer Relationship Management (CRM) platform designed to centralize customer interactions, sales pipelines, lead conversions, team collaboration, and daily task management into an intuitive, high-performance web application.

---

## 🚀 Key Features

### 1. User Authentication & Profile Management
- Secure user registration and authentication.
- Password reset and update workflows.
- User profile management (name, phone, title, avatar).

### 2. Role-Based Access Control (RBAC)
- Support for 3 distinct roles:
  - **Admin**: Full workspace access, user role assignment, and team member management.
  - **Sales Manager**: Team overview, pipeline oversight, and lead assignment.
  - **Sales Executive**: Personal lead tracking, task updates, and customer management.

### 3. Customer Management
- Add, view, edit, and delete customer records.
- Comprehensive customer profiles displaying contact information, associated leads, tasks, and historical activity logs.
- Real-time search and filter by status.

### 4. Lead Management
- Full lead lifecycle management with estimated deal value, source, and contact information.
- Assign leads to specific team members.
- One-click **Convert Lead to Customer** with automatic linking.

### 5. Interactive Sales Pipeline
- Visual Kanban board tracking deals across 6 stages:
  - `New` ➔ `Contacted` ➔ `Qualified` ➔ `Proposal Sent` ➔ `Won` ➔ `Lost`
- Drag-and-drop deal movement with automated stage change activity logging.
- Real-time value aggregation per pipeline stage.

### 6. Task Management
- Create, assign, and track tasks with priorities (`Low`, `Medium`, `High`) and due dates.
- Filter tasks by assignee, status (`Pending`, `In Progress`, `Completed`), and due dates.

### 7. Executive Dashboard & Analytics
- Live KPI cards: Total Customers, Active Leads, Pending Tasks, Closed Revenue.
- Data visualizations powered by Recharts (Pipeline value by stage, deal status distribution).
- Recent activity audit feed.

### 8. Notifications
- In-app notification center with real-time updates for assigned tasks, lead progression, and system alerts.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Radix UI primitives.
- **Routing & State**: TanStack Router, TanStack Start, TanStack React Query.
- **Charts & UI**: Recharts, Sonner notifications.
- **Data & Auth Layer**: PostgreSQL / Supabase, Zod schema validation.

---

## 💻 Getting Started Locally

### Prerequisites
- Node.js (v18 or v20+ recommended)
- npm or pnpm or bun

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Ensure your `.env` file is present in the root directory:
```env
VITE_SUPABASE_URL="<YOUR_SUPABASE_URL>"
VITE_SUPABASE_PUBLISHABLE_KEY="<YOUR_SUPABASE_PUBLISHABLE_KEY>"
SUPABASE_URL="<YOUR_SUPABASE_URL>"
SUPABASE_PUBLISHABLE_KEY="<YOUR_SUPABASE_PUBLISHABLE_KEY>"
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🌐 Deployment & Hosting

### Deploy to Vercel
1. Push this repository to GitHub or GitLab.
2. Import the repository into [Vercel](https://vercel.com).
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
4. Deploy!

### Deploy to Netlify / Render
1. Link your git repository.
2. Build command: `npm run build`
3. Add the required environment variables in your hosting dashboard.
