const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
    try {
        console.log('🔧 Creating admin user...');

        // Admin user details
        const adminData = {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@coldoutreach.com',
            password: 'admin123', // This will be hashed
            role: UserRole.ADMIN
        };

        // Check if admin already exists
        const existingAdmin = await prisma.cOUsers.findUnique({
            where: { email: adminData.email }
        });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists with email:', adminData.email);
            console.log('✅ Admin user details:');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
            console.log(`   Role: ${existingAdmin.role}`);
            console.log(`   Active: ${existingAdmin.isActive}`);
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(adminData.password, 12);

        // Create admin user
        const adminUser = await prisma.cOUsers.create({
            data: {
                firstName: adminData.firstName,
                lastName: adminData.lastName,
                email: adminData.email,
                password: hashedPassword,
                role: adminData.role
            }
        });

        console.log('✅ Admin user created successfully!');
        console.log('📧 Login credentials:');
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   Password: ${adminData.password}`);
        console.log(`   Role: ${adminUser.role}`);
        console.log('');
        console.log('🔐 You can now use these credentials to:');
        console.log('   1. Login as admin at /add-user page');
        console.log('   2. Create new users through the admin interface');
        console.log('   3. Test the authentication system');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);

        if (error.code === 'P2002') {
            console.log('💡 This error usually means the email already exists in the database.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Also create a test regular user
async function createTestUser() {
    try {
        console.log('🔧 Creating test user...');

        const userData = {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@coldoutreach.com',
            password: 'test123',
            role: UserRole.USER
        };

        // Check if user already exists
        const existingUser = await prisma.cOUsers.findUnique({
            where: { email: userData.email }
        });

        if (existingUser) {
            console.log('⚠️  Test user already exists with email:', userData.email);
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // Create test user
        const testUser = await prisma.cOUsers.create({
            data: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                password: hashedPassword,
                role: userData.role
            }
        });

        console.log('✅ Test user created successfully!');
        console.log('📧 Login credentials:');
        console.log(`   Email: ${testUser.email}`);
        console.log(`   Password: ${userData.password}`);
        console.log(`   Role: ${testUser.role}`);

    } catch (error) {
        console.error('❌ Error creating test user:', error);
    }
}

async function main() {
    console.log('🚀 Setting up authentication users...\n');

    await createAdminUser();
    console.log(''); // Add spacing
    await createTestUser();

    console.log('\n🎉 Setup complete! You can now test the authentication system.');
}

main()
    .catch((e) => {
        console.error('❌ Script failed:', e);
        process.exit(1);
    }); 