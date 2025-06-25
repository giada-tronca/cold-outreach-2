const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedServices() {
    try {
        console.log('🌱 Seeding services...')

        // Check if services already exist
        const existingServices = await prisma.cOServices.count()
        if (existingServices > 0) {
            console.log(`✅ Services already exist (${existingServices} found)`)
            return
        }

        // Create default services (only use fields that exist in COServices model)
        const services = [
            {
                name: 'LinkedIn Enrichment',
                isActive: true
            },
            {
                name: 'Company Website Analysis',
                isActive: true
            },
            {
                name: 'Technology Stack Detection',
                isActive: true
            },
            {
                name: 'AI Content Generation',
                isActive: true
            },
            {
                name: 'Basic Prospect Processing',
                isActive: true
            }
        ]

        for (const service of services) {
            await prisma.cOServices.create({
                data: service
            })
            console.log(`✅ Created service: ${service.name}`)
        }

        console.log('🎉 Services seeded successfully!')

    } catch (error) {
        console.error('❌ Error seeding services:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

seedServices()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    }) 