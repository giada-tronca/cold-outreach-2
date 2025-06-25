# Cold Outreach AI - Quick Setup Guide

## 🚀 **Environment Fixed! Ready to Run**

### ✅ **Issues Resolved**
- ✅ **Tailwind CSS v4 Fixed**: Added `@reference` directive for custom properties
- ✅ **Environment Configuration**: Complete setup for dev/production
- ✅ **Database Integration**: Prisma schema matching your existing database
- ✅ **TypeScript**: Strict mode, type-safe configuration

---

## 🏃‍♂️ **Quick Start (Choose One)**

### **Option 1: Use Your Existing Database**
```bash
# 1. Update database URL in backend
cd cold-outreach-backend
nano .env  # or your preferred editor
# Update: DATABASE_URL="postgresql://your_user:your_password@your_host:5432/your_db"

# 2. Start backend
npm run dev

# 3. In another terminal, start frontend
cd ../cold-outreach-frontend
npm run dev
```

### **Option 2: Quick Test with Local Database**
```bash
# 1. Start with default configuration (will fail but show what needs updating)
cd cold-outreach-backend
npm run dev  # Will show connection error with details

# 2. Update DATABASE_URL as shown in error, then restart
# 3. Start frontend in another terminal
cd ../cold-outreach-frontend
npm run dev
```

---

## 📁 **Directory Structure & Commands**

### **Backend** (`cold-outreach-backend/`)
```bash
npm run dev              # Start development server
npm run build           # Build for production
npm run type-check      # TypeScript validation
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to database
npm run db:studio       # Open Prisma Studio (database GUI)
npm run setup:env       # Interactive environment setup
```

### **Frontend** (`cold-outreach-frontend/`)
```bash
npm run dev             # Start development server (http://localhost:5173)
npm run build          # Build for production
npm run preview        # Preview production build
```

---

## 🔧 **Configuration Files**

### **Backend Environment**
- `.env` - Main environment file (created from template)
- `config.development.example` - Development template
- `config.production.example` - Production template

### **Frontend Environment**
- `env.development.example` - Development template
- `env.production.example` - Production template

---

## 📊 **Health Check Endpoints**

Once backend is running:
- **Health Check**: http://localhost:3001/health
- **Database Stats**: http://localhost:3001/api/stats
- **Basic API Test**: http://localhost:3001/api/test

---

## 🐛 **Common Issues & Solutions**

### **"Missing script: dev" Error**
❌ **Problem**: Running `npm run dev` from wrong directory
✅ **Solution**: Always run from specific project directory:
```bash
# For backend
cd cold-outreach-backend && npm run dev

# For frontend  
cd cold-outreach-frontend && npm run dev
```

### **Database Connection Error**
❌ **Problem**: DATABASE_URL has placeholder values
✅ **Solution**: Update `.env` file with real database credentials:
```bash
DATABASE_URL="postgresql://real_user:real_password@real_host:5432/real_database"
```

### **Tailwind CSS Errors**
✅ **Fixed**: Updated to Tailwind v4 syntax with `@reference` directive

---

## 🎯 **Current Status**

### ✅ **Phase 1 Complete**
- [x] **1.1 Project Setup**: React + Node.js + TypeScript
- [x] **1.2 Database Setup**: Prisma + PostgreSQL integration  
- [x] **1.3 Environment Configuration**: Multi-environment setup

### 🚀 **Ready for Phase 2**
- **Next**: Core UI Components & Layout
- **Foundation**: Production-ready backend + frontend
- **Features**: Type safety, environment management, database integration

---

## 📝 **Quick Verification**

1. **Backend Health Check**:
   ```bash
   curl http://localhost:3001/health
   ```

2. **Frontend**: Visit http://localhost:5173

3. **Both should show**: Clean startup logs without errors

---

**You're all set! 🎉 No more Tailwind errors, proper environment setup, and ready for development.** 