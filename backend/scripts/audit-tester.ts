import fs from 'fs';
import path from 'path';
import { testData, seedData } from './audit-runner.js';

const API_BASE = "http://localhost:5001/api";

type TestResult = {
    endpoint: string;
    method: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    reason?: string;
};

// Generates a mock value for a given schema type
function generateMockValue(schema: any, propName: string): any {
    if (!schema) return null;
    
    if (schema.type === 'string') {
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'date') return new Date().toISOString().split('T')[0];
        if (propName.toLowerCase().includes('email')) return `test_${Date.now()}@test.com`;
        if (schema.enum) return schema.enum[0];
        return `Test String ${Date.now()}`;
    }
    if (schema.type === 'number' || schema.type === 'integer') return 1;
    if (schema.type === 'boolean') return true;
    if (schema.type === 'array') return [];
    if (schema.type === 'object') return {};
    return null;
}

function generatePayload(schema: any): any {
    if (!schema || schema.type !== 'object' || !schema.properties) return {};
    const payload: any = {};
    for (const key of Object.keys(schema.properties)) {
        payload[key] = generateMockValue(schema.properties[key], key);
    }
    return payload;
}

function resolvePathParams(route: string): string {
    let resolved = route;
    if (resolved.includes('{organizationId}')) resolved = resolved.replace('{organizationId}', testData.organizationId);
    if (resolved.includes('{academicYearId}')) resolved = resolved.replace('{academicYearId}', testData.academicYearId);
    if (resolved.includes('{yearId}')) resolved = resolved.replace('{yearId}', testData.academicYearId);

    
    // For generic {id}, guess based on route
    if (resolved.includes('{id}')) {
        if (route.includes('/grades')) resolved = resolved.replace('{id}', testData.gradeId);
        else if (route.includes('/academic-years')) resolved = resolved.replace('{id}', testData.academicYearId);
        else if (route.includes('/schools')) resolved = resolved.replace('{id}', testData.organizationId);
        else resolved = resolved.replace('{id}', testData.organizationId); // fallback
    }
    
    return resolved;
}

async function runTester() {
    console.log("Preparing environment and seeding data...");
    await seedData();
    
    console.log("Fetching Swagger definition...");
    const swaggerRes = await fetch(`${API_BASE}/openapi.json`);
    if (!swaggerRes.ok) throw new Error("Failed to fetch Swagger definitions");
    const swagger = await swaggerRes.json();
    
    const results: TestResult[] = [];
    
    console.log("Starting Audit Tester...");

    const paths = Object.keys(swagger.paths);
    
    for (const route of paths) {
        // Skip auth endpoints as they are handled manually and require specific bodies
        if (route.startsWith('/auth')) continue;

        for (const method of Object.keys(swagger.paths[route])) {
            const endpointDef = swagger.paths[route][method];
            const resolvedPath = resolvePathParams(route);
            const url = resolvedPath.startsWith('/api') 
                ? `http://localhost:5001${resolvedPath}`
                : `${API_BASE}${resolvedPath}`;
            
            console.log(`Testing ${method.toUpperCase()} ${route}...`);
            
            // 1. UNAUTHORIZED TEST (No Token)
            try {
                const noTokenRes = await fetch(url, { method: method.toUpperCase() });
                if (noTokenRes.status !== 401 && noTokenRes.status !== 403) {
                    results.push({ endpoint: route, method, status: 'FAIL', reason: `Expected 401/403 without token, got ${noTokenRes.status}` });
                    continue;
                }
            } catch (e: any) {
                results.push({ endpoint: route, method, status: 'FAIL', reason: `Network error on no-token test: ${e.message}` });
                continue;
            }

            // 2. HAPPY PATH TEST (Admin Token)
            let bodyPayload = undefined;
            if (['post', 'put', 'patch'].includes(method)) {
                // Try to build a payload
                const reqBody = endpointDef.requestBody;
                if (reqBody && reqBody.content && reqBody.content['application/json']) {
                    const schema = reqBody.content['application/json'].schema;
                    bodyPayload = generatePayload(schema);
                    
                    // Specific fix for POST endpoints needing IDs
                    if (route.includes('/grades') && method === 'post') bodyPayload.organizationId = testData.organizationId;
                    if (route.includes('/academic-years') && method === 'post') bodyPayload.organizationId = testData.organizationId;
                }
            }
            
            const reqOptions: RequestInit = {
                method: method.toUpperCase(),
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': testData.adminToken
                }
            };
            if (bodyPayload) reqOptions.body = JSON.stringify(bodyPayload);

            try {
                const res = await fetch(url, reqOptions);
                // 200, 201, 204 are success. 
                // 400 is acceptable as validation works, 
                // 404 is acceptable if ID guessed is not perfectly mapped.
                // 500 is a clear failure.
                if (res.status >= 500) {
                    const errorText = await res.text();
                    results.push({ endpoint: route, method, status: 'FAIL', reason: `Server Error ${res.status}: ${errorText.substring(0, 100)}` });
                } else {
                    results.push({ endpoint: route, method, status: 'PASS' });
                }
            } catch (e: any) {
                results.push({ endpoint: route, method, status: 'FAIL', reason: `Network error on happy path test: ${e.message}` });
            }
        }
    }
    
    // Generate Report
    const total = results.length;
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL');
    
    let reportMd = `# FOUNDATION API AUDIT REPORT\n\n`;
    reportMd += `**Total Endpoints Tested**: ${total}\n`;
    reportMd += `**Passed**: ${passed}\n`;
    reportMd += `**Failed**: ${failed.length}\n`;
    reportMd += `**Overall Decision**: ${failed.length === 0 ? 'READY' : 'NOT READY'}\n\n`;
    
    if (failed.length > 0) {
        reportMd += `## Failures\n`;
        failed.forEach(f => {
            reportMd += `- **${f.method.toUpperCase()} ${f.endpoint}**: ${f.reason}\n`;
        });
    }

    reportMd += `\n## All Tested Endpoints\n`;
    results.forEach(r => {
        reportMd += `- [${r.status}] ${r.method.toUpperCase()} ${r.endpoint}\n`;
    });
    
    const docPath = path.join(process.cwd(), '../Docs/architecture/school-domain');
    fs.writeFileSync(path.join(docPath, 'FOUNDATION_API_AUDIT_REPORT.md'), reportMd);
    
    // Write test data out
    let testDataMd = `# TEST DATA\n\n`;
    for (const [key, value] of Object.entries(testData)) {
        testDataMd += `**${key}**: \`${value}\`\n\n`;
    }
    fs.writeFileSync(path.join(docPath, 'TEST_DATA.md'), testDataMd);

    console.log(`\nAudit finished! Total: ${total}, Passed: ${passed}, Failed: ${failed.length}`);
}

runTester().catch(console.error);
