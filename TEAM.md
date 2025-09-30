# Team Information

## Team Name: NetVision

## Team Members:

| S.No | Name           | Registration Number | Email                     |
|------|----------------|---------------------|---------------------------|
| 1    | Tanay Mitra    | 24BCE1287          | tanay.mitra2024@vitstudent.ac.in |
| 2    | Adithyan K.R   | 24BCE1303          | adithyan.kr2024@vitstudent.ac.in |

## Project Title
Network Monitoring & Security Dashboard

## Project Description
A comprehensive real-time network monitoring and security dashboard that provides insights into network traffic, connected devices, running processes, and security threats. The system collects and analyzes network data to provide actionable intelligence for network administrators.

## Technology Stack

### Programming Languages
- TypeScript
- SQL

### Frameworks & Libraries
- Frontend: React 18, Vite
- Backend: Node.js, Express
- Database: PostgreSQL (Supabase)
- UI Components: Shadcn UI, Radix UI
- Charts: Recharts
- Icons: Lucide React

### Tools
- Version Control: Git, GitHub
- Package Manager: npm
- Development Environment: Visual Studio Code
- API Testing: Postman
- Containerization: Docker

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation
1. Clone the repository:
   ```bash
   git clone [repository-url].git
   cd CnDashBoard-main
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your Supabase URL and anon key:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. For network monitoring, run:
   ```bash
   npm run monitor
   ```

### Database Setup
1. Create a new project in Supabase
2. Run the SQL schema from `supabase/schema.sql`
3. Import the seed data from `supabase/seed_data.sql`
4. Disable RLS (Row Level Security) for development:
   ```sql
   ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
   ALTER TABLE hosts DISABLE ROW LEVEL SECURITY;
   ALTER TABLE processes DISABLE ROW LEVEL SECURITY;
   ALTER TABLE connections DISABLE ROW LEVEL SECURITY;
   ALTER TABLE network_stats DISABLE ROW LEVEL SECURITY;
   ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
   ```

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```
