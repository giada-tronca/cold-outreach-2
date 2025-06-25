const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

class DatabaseAnalyzer {
    constructor() {
        this.prisma = new PrismaClient();
        this.databaseStructure = {
            tables: {},
            relationships: [],
            indexes: [],
            constraints: []
        };
    }

    async analyzeDatabaseStructure() {
        console.log('🔍 Analyzing database structure...');

        try {
            // Get all tables
            const tables = await this.getAllTables();
            console.log(`📊 Found ${tables.length} tables`);

            // Analyze each table
            for (const table of tables) {
                console.log(`🔍 Analyzing table: ${table.table_name}`);
                await this.analyzeTable(table.table_name);
            }

            // Get relationships
            await this.getRelationships();

            // Get indexes
            await this.getIndexes();

            // Get constraints
            await this.getConstraints();

            console.log('✅ Database analysis complete');
            return this.databaseStructure;

        } catch (error) {
            console.error('❌ Error analyzing database:', error);
            throw error;
        }
    }

    async getAllTables() {
        const result = await this.prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
        return result;
    }

    async analyzeTable(tableName) {
        // Get column information
        const columns = await this.prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        udt_name
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

        // Get primary keys
        const primaryKeys = await this.prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc
        ON kcu.constraint_name = tc.constraint_name
      WHERE tc.table_name = ${tableName}
        AND tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public';
    `;

        // Get foreign keys
        const foreignKeys = await this.prisma.$queryRaw`
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = ${tableName}
        AND tc.table_schema = 'public';
    `;

        this.databaseStructure.tables[tableName] = {
            columns: columns.map(col => ({
                name: col.column_name,
                type: col.data_type,
                udtName: col.udt_name,
                nullable: col.is_nullable === 'YES',
                default: col.column_default,
                maxLength: col.character_maximum_length,
                precision: col.numeric_precision,
                scale: col.numeric_scale,
                isPrimaryKey: primaryKeys.some(pk => pk.column_name === col.column_name)
            })),
            primaryKeys: primaryKeys.map(pk => pk.column_name),
            foreignKeys: foreignKeys.map(fk => ({
                column: fk.column_name,
                referencesTable: fk.foreign_table_name,
                referencesColumn: fk.foreign_column_name,
                constraintName: fk.constraint_name
            }))
        };
    }

    async getRelationships() {
        const relationships = await this.prisma.$queryRaw`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public';
    `;

        this.databaseStructure.relationships = relationships;
    }

    async getIndexes() {
        const indexes = await this.prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `;

        this.databaseStructure.indexes = indexes;
    }

    async getConstraints() {
        const constraints = await this.prisma.$queryRaw`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        cc.check_clause
      FROM information_schema.table_constraints AS tc
      LEFT JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.check_constraints AS cc
        ON tc.constraint_name = cc.constraint_name
        AND tc.table_schema = cc.constraint_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('CHECK', 'UNIQUE')
      ORDER BY tc.table_name, tc.constraint_name;
    `;

        this.databaseStructure.constraints = constraints;
    }

    generatePrismaSchema() {
        console.log('🔧 Generating Prisma schema...');

        let schema = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

        // Generate models for each table
        for (const [tableName, tableInfo] of Object.entries(this.databaseStructure.tables)) {
            const modelName = this.toPascalCase(tableName);
            schema += `model ${modelName} {\n`;

            // Add columns
            for (const column of tableInfo.columns) {
                const fieldName = this.toCamelCase(column.name);
                const prismaType = this.mapToPrismaType(column);
                const attributes = this.generateFieldAttributes(column, tableInfo);

                schema += `  ${fieldName.padEnd(20)} ${prismaType}${attributes}\n`;
            }

            // Add relationships
            const relationships = this.databaseStructure.relationships.filter(
                rel => rel.table_name === tableName || rel.foreign_table_name === tableName
            );

            for (const rel of relationships) {
                if (rel.table_name === tableName) {
                    // This table has a foreign key to another table
                    const relatedModel = this.toPascalCase(rel.foreign_table_name);
                    const fieldName = this.toCamelCase(rel.foreign_table_name);
                    schema += `  ${fieldName.padEnd(20)} ${relatedModel}? @relation(fields: [${this.toCamelCase(rel.column_name)}], references: [${this.toCamelCase(rel.foreign_column_name)}])\n`;
                }
            }

            schema += `\n  @@map("${tableName}")\n`;
            schema += `}\n\n`;
        }

        return schema;
    }

    generateDatabaseDocumentation() {
        console.log('📝 Generating database documentation...');

        let doc = `# Database Structure Documentation

Generated on: ${new Date().toISOString()}

## Overview

This document describes the current database structure after recent modifications.

## Tables

`;

        for (const [tableName, tableInfo] of Object.entries(this.databaseStructure.tables)) {
            doc += `### ${tableName}\n\n`;

            // Table description
            doc += `**Columns:**\n\n`;
            doc += `| Column | Type | Nullable | Default | Primary Key | Foreign Key |\n`;
            doc += `|--------|------|----------|---------|-------------|-------------|\n`;

            for (const column of tableInfo.columns) {
                const fk = tableInfo.foreignKeys.find(fk => fk.column === column.name);
                const fkInfo = fk ? `${fk.referencesTable}.${fk.referencesColumn}` : '-';

                doc += `| ${column.name} | ${column.type}${column.maxLength ? `(${column.maxLength})` : ''} | ${column.nullable ? 'Yes' : 'No'} | ${column.default || '-'} | ${column.isPrimaryKey ? 'Yes' : 'No'} | ${fkInfo} |\n`;
            }

            doc += `\n`;

            // Relationships
            if (tableInfo.foreignKeys.length > 0) {
                doc += `**Foreign Key Relationships:**\n\n`;
                for (const fk of tableInfo.foreignKeys) {
                    doc += `- \`${fk.column}\` references \`${fk.referencesTable}.${fk.referencesColumn}\`\n`;
                }
                doc += `\n`;
            }
        }

        // Add relationships section
        if (this.databaseStructure.relationships.length > 0) {
            doc += `## Relationships\n\n`;
            for (const rel of this.databaseStructure.relationships) {
                doc += `- \`${rel.table_name}.${rel.column_name}\` → \`${rel.foreign_table_name}.${rel.foreign_column_name}\`\n`;
                doc += `  - Update Rule: ${rel.update_rule}\n`;
                doc += `  - Delete Rule: ${rel.delete_rule}\n\n`;
            }
        }

        // Add indexes section
        if (this.databaseStructure.indexes.length > 0) {
            doc += `## Indexes\n\n`;
            doc += `| Table | Index Name | Definition |\n`;
            doc += `|-------|------------|------------|\n`;
            for (const index of this.databaseStructure.indexes) {
                doc += `| ${index.tablename} | ${index.indexname} | \`${index.indexdef}\` |\n`;
            }
            doc += `\n`;
        }

        return doc;
    }

    generateTypeScriptTypes() {
        console.log('📝 Generating TypeScript types...');

        let types = `// Generated TypeScript types for database models
// Generated on: ${new Date().toISOString()}

`;

        for (const [tableName, tableInfo] of Object.entries(this.databaseStructure.tables)) {
            const typeName = this.toPascalCase(tableName);
            types += `export interface ${typeName} {\n`;

            for (const column of tableInfo.columns) {
                const fieldName = this.toCamelCase(column.name);
                const tsType = this.mapToTypeScriptType(column);
                const optional = column.nullable ? '?' : '';

                types += `  ${fieldName}${optional}: ${tsType};\n`;
            }

            types += `}\n\n`;

            // Create input types for API
            types += `export interface Create${typeName}Input {\n`;
            for (const column of tableInfo.columns) {
                if (column.isPrimaryKey && column.default) continue; // Skip auto-generated primary keys

                const fieldName = this.toCamelCase(column.name);
                const tsType = this.mapToTypeScriptType(column);
                const optional = column.nullable || column.default ? '?' : '';

                types += `  ${fieldName}${optional}: ${tsType};\n`;
            }
            types += `}\n\n`;

            types += `export interface Update${typeName}Input {\n`;
            for (const column of tableInfo.columns) {
                if (column.isPrimaryKey) continue; // Skip primary keys in updates

                const fieldName = this.toCamelCase(column.name);
                const tsType = this.mapToTypeScriptType(column);

                types += `  ${fieldName}?: ${tsType};\n`;
            }
            types += `}\n\n`;
        }

        return types;
    }

    // Helper methods
    toPascalCase(str) {
        return str.replace(/(^|_)([a-z])/g, (_, __, letter) => letter.toUpperCase());
    }

    toCamelCase(str) {
        const pascal = this.toPascalCase(str);
        return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    }

    mapToPrismaType(column) {
        const typeMap = {
            'integer': 'Int',
            'bigint': 'BigInt',
            'smallint': 'Int',
            'decimal': 'Decimal',
            'numeric': 'Decimal',
            'real': 'Float',
            'double precision': 'Float',
            'character varying': 'String',
            'varchar': 'String',
            'char': 'String',
            'text': 'String',
            'boolean': 'Boolean',
            'date': 'DateTime',
            'timestamp': 'DateTime',
            'timestamp without time zone': 'DateTime',
            'timestamp with time zone': 'DateTime',
            'time': 'DateTime',
            'uuid': 'String',
            'json': 'Json',
            'jsonb': 'Json'
        };

        let prismaType = typeMap[column.type] || 'String';

        if (!column.nullable) {
            // Non-nullable field
        } else {
            prismaType += '?';
        }

        return prismaType;
    }

    mapToTypeScriptType(column) {
        const typeMap = {
            'integer': 'number',
            'bigint': 'number',
            'smallint': 'number',
            'decimal': 'number',
            'numeric': 'number',
            'real': 'number',
            'double precision': 'number',
            'character varying': 'string',
            'varchar': 'string',
            'char': 'string',
            'text': 'string',
            'boolean': 'boolean',
            'date': 'Date',
            'timestamp': 'Date',
            'timestamp without time zone': 'Date',
            'timestamp with time zone': 'Date',
            'time': 'Date',
            'uuid': 'string',
            'json': 'any',
            'jsonb': 'any'
        };

        return typeMap[column.type] || 'any';
    }

    generateFieldAttributes(column, tableInfo) {
        let attributes = '';

        if (column.isPrimaryKey) {
            attributes += ' @id';
            if (column.default && column.default.includes('nextval')) {
                attributes += ' @default(autoincrement())';
            }
        } else if (column.default) {
            if (column.default === 'now()' || column.default.includes('CURRENT_TIMESTAMP')) {
                attributes += ' @default(now())';
            } else if (column.default === 'gen_random_uuid()') {
                attributes += ' @default(uuid())';
            } else if (column.type === 'boolean') {
                attributes += ` @default(${column.default})`;
            }
        }

        if (column.name.includes('_at') && column.type.includes('timestamp')) {
            if (column.name === 'updated_at') {
                attributes += ' @updatedAt';
            } else if (column.name === 'created_at') {
                attributes += ' @default(now())';
            }
        }

        // Add database field mapping if different from Prisma field name
        const prismaFieldName = this.toCamelCase(column.name);
        if (prismaFieldName !== column.name) {
            attributes += ` @map("${column.name}")`;
        }

        return attributes;
    }

    async saveFiles(structure, schema, documentation, types) {
        const outputDir = path.join(__dirname, '..', 'database-analysis');

        // Create output directory
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Save raw structure
        fs.writeFileSync(
            path.join(outputDir, 'database-structure.json'),
            JSON.stringify(structure, null, 2)
        );

        // Save Prisma schema
        fs.writeFileSync(
            path.join(outputDir, 'schema.prisma'),
            schema
        );

        // Save documentation
        fs.writeFileSync(
            path.join(outputDir, 'database-structure.md'),
            documentation
        );

        // Save TypeScript types
        fs.writeFileSync(
            path.join(outputDir, 'database-types.ts'),
            types
        );

        console.log(`📁 Files saved to: ${outputDir}`);
    }

    async cleanup() {
        await this.prisma.$disconnect();
    }
}

async function main() {
    const analyzer = new DatabaseAnalyzer();

    try {
        // Analyze database
        const structure = await analyzer.analyzeDatabaseStructure();

        // Generate files
        const schema = analyzer.generatePrismaSchema();
        const documentation = analyzer.generateDatabaseDocumentation();
        const types = analyzer.generateTypeScriptTypes();

        // Save all files
        await analyzer.saveFiles(structure, schema, documentation, types);

        console.log('\n✅ Database analysis complete!');
        console.log('📁 Check the database-analysis folder for generated files:');
        console.log('  - database-structure.json (raw structure data)');
        console.log('  - schema.prisma (new Prisma schema)');
        console.log('  - database-structure.md (documentation)');
        console.log('  - database-types.ts (TypeScript types)');
        console.log('\n📝 Next steps:');
        console.log('  1. Review the generated schema.prisma file');
        console.log('  2. Replace your current prisma/schema.prisma with the generated one');
        console.log('  3. Run: npx prisma generate');
        console.log('  4. Update your controllers to use the new model names');
        console.log('  5. Update your TypeScript types');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await analyzer.cleanup();
    }
}

if (require.main === module) {
    main();
}

module.exports = { DatabaseAnalyzer }; 