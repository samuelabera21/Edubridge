import { GoogleGenAI } from "@google/genai";
import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType } from "../../generated/prisma/client.js";
import { HierarchyScopeService, AccessibleOrganizationScope } from "../hierarchy/hierarchy-scope.service.js";

export interface AiChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface AiAnalyticsResponse {
    question: string;
    summary: string;
    keyMetrics?: Array<{ label: string; value: string | number; change?: string }>;
    tableData?: {
        headers: string[];
        rows: Array<Array<string | number | boolean | null>>;
    };
    suggestedFollowUps: string[];
    sqlQuery?: string;
    scopeLevel: OrganizationUnitType;
    scopeName: string;
    executionTimeMs: number;
}

export class AiAnalyticsService {
    private static genAI: GoogleGenAI | null = null;

    private static getClient(): GoogleGenAI {
        if (!this.genAI) {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("GEMINI_API_KEY is not configured in backend/.env");
            }
            this.genAI = new GoogleGenAI({ apiKey });
        }
        return this.genAI;
    }

    /**
     * Sanitizes and validates that the query is safe, read-only PostgreSQL.
     */
    private static validateAndSanitizeSql(rawSql: string): string {
        let sql = rawSql
            .replace(/```sql/gi, "")
            .replace(/```/g, "")
            .trim();

        // Must start with SELECT or WITH
        if (!/^(SELECT|WITH)\s/i.test(sql)) {
            throw new Error("Only read-only SELECT queries are permitted.");
        }

        // Block destructive or administrative keywords
        const forbiddenKeywords = [
            /\bINSERT\b/i,
            /\bUPDATE\b/i,
            /\bDELETE\b/i,
            /\bDROP\b/i,
            /\bALTER\b/i,
            /\bTRUNCATE\b/i,
            /\bEXEC\b/i,
            /\bEXECUTE\b/i,
            /\bCREATE\b/i,
            /\bGRANT\b/i,
            /\bREVOKE\b/i,
            /\bCOPY\b/i,
            /\bVACUUM\b/i,
            /\bREINDEX\b/i,
            /\bCOMMENT\b/i,
            /--/,
            /\/\*/,
            /;/ // Block chained commands
        ];

        // Strip trailing semicolon if present
        if (sql.endsWith(";")) {
            sql = sql.slice(0, -1).trim();
        }

        for (const pattern of forbiddenKeywords) {
            if (pattern.test(sql)) {
                throw new Error("SQL query contained unauthorized commands or symbols.");
            }
        }

        // Enforce maximum row limit if not specified
        if (!/\bLIMIT\b/i.test(sql)) {
            sql += " LIMIT 100";
        }

        return sql;
    }

    /**
     * Resilient content generation with multi-model fallback (e.g. gemini-3.8-flash -> gemini-3.5-flash -> gemini-flash-latest)
     */
    private static async generateContentWithFallback(prompt: string): Promise<string> {
        const ai = this.getClient();
        const models = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-latest"];
        let lastError: any = null;

        for (const model of models) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt
                });
                if (response.text) {
                    return response.text;
                }
            } catch (err: any) {
                lastError = err;
                console.warn(`[AiAnalytics] Model ${model} encountered issue (${err.message || err.status}), falling back...`);
            }
        }

        throw lastError || new Error("All AI model candidates failed to generate response.");
    }

    /**
     * Translates a natural language question into PostgreSQL SELECT statement.
     */
    private static async generateSql(
        question: string,
        scope: AccessibleOrganizationScope,
        previousError?: string
    ): Promise<string> {
        const scopeContext = scope.currentOrganizationType === "FEDERAL"
            ? `SCOPE: FEDERAL (National). You may query all organization units and schools across the entire nation.`
            : `SCOPE: ${scope.currentOrganizationType} (Name: "${scope.currentOrganization.name}", ID: "${scope.currentOrganization.id}").
CRITICAL SCOPE RESTRICTION: The user is only authorized to access data within their assigned organization tree.
- Allowed descendant school IDs: ${JSON.stringify(scope.descendantSchoolIds.slice(0, 100))}
- Allowed organization IDs: ${JSON.stringify(scope.accessibleOrganizationIds.slice(0, 100))}
You MUST filter records so they only include organization units or schools belonging to this scope (e.g. using IN (...) or joining with authorized parent units).`;

        const prompt = `You are a PostgreSQL expert database analyst for the Ethiopian Ministry of Education EMIS (EduBridge).
Your task is to convert a user's natural language question into a high-performance, accurate PostgreSQL SELECT query.

${scopeContext}

DATABASE SCHEMA & CONVENTIONS:
All table and column names in PostgreSQL MUST be double-quoted. Note which tables use PascalCase vs lowercase:
1. "OrganizationUnit" (
   "id" TEXT PRIMARY KEY,
   "name" TEXT,
   "type" TEXT ('FEDERAL', 'REGION', 'ZONE', 'WOREDA', 'SCHOOL'),
   "parentId" TEXT REFERENCES "OrganizationUnit"("id")
)
2. "teacher" (
   "id" TEXT PRIMARY KEY,
   "organizationId" TEXT REFERENCES "OrganizationUnit"("id"),
   "firstName" TEXT,
   "lastName" TEXT,
   "gender" TEXT,
   "employmentStatus" TEXT ('ACTIVE', 'INACTIVE', 'PROBATION'),
   "status" TEXT ('ACTIVE', 'SUSPENDED'),
   "jobTitle" TEXT,
   "region" TEXT,
   "zone" TEXT,
   "woreda" TEXT
)
3. "school_profile" (
   "id" TEXT PRIMARY KEY,
   "organizationId" TEXT REFERENCES "OrganizationUnit"("id"),
   "status" TEXT ('ACTIVE', 'INACTIVE', 'PENDING'),
   "address" TEXT,
   "contactEmail" TEXT,
   "phoneNumber" TEXT,
   "establishedYear" INT
)
4. "student_enrollment" (
   "id" TEXT PRIMARY KEY,
   "studentId" TEXT,
   "organizationId" TEXT REFERENCES "OrganizationUnit"("id"),
   "academicYearId" TEXT,
   "schoolGradeId" TEXT,
   "sectionId" TEXT,
   "status" TEXT ('ACTIVE', 'ENROLLED', 'TRANSFERRED', 'DROPPED_OUT')
)
5. "student" (
   "id" TEXT PRIMARY KEY,
   "firstName" TEXT,
   "lastName" TEXT,
   "gender" TEXT,
   "dateOfBirth" TIMESTAMP
)
6. "grade" (
   "id" TEXT PRIMARY KEY,
   "organizationId" TEXT,
   "name" TEXT,
   "level" INT
)
7. "subject" (
   "id" TEXT PRIMARY KEY,
   "organizationId" TEXT,
   "name" TEXT
)
8. "student_attendance" (
   "id" TEXT PRIMARY KEY,
   "organizationId" TEXT,
   "status" TEXT ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED'),
   "date" TIMESTAMP
)
9. "national_directive" (
   "id" TEXT PRIMARY KEY,
   "title" TEXT,
   "type" TEXT,
   "priority" TEXT,
   "status" TEXT
)
10. "program" (
   "id" TEXT PRIMARY KEY,
   "title" TEXT,
   "type" TEXT,
   "status" TEXT
)
11. "data_request" (
   "id" TEXT PRIMARY KEY,
   "title" TEXT,
   "status" TEXT,
   "priority" TEXT
)

MANDATORY QUERY INSTRUCTIONS:
- Return ONLY the raw PostgreSQL SELECT statement.
- Do NOT wrap in markdown backticks, no comments, no explanations.
- All table names and column names MUST be double-quoted (e.g. "OrganizationUnit", "teacher", "organizationId", "type", "id").
- For counting teachers per school, join "OrganizationUnit" (where "type" = 'SCHOOL') with "teacher" (on "OrganizationUnit"."id" = "teacher"."organizationId"). Use LEFT JOIN so schools with 0 teachers are included.
- For regional or zonal aggregations, join parent and child units via "parentId".
${previousError ? `\nPREVIOUS ATTEMPT FAILED WITH ERROR: ${previousError}. Please fix the query syntax accordingly.` : ""}

USER QUESTION: "${question}"`;

        const rawText = await this.generateContentWithFallback(prompt);
        return this.validateAndSanitizeSql(rawText);
    }

    /**
     * Synthesizes the query results into an executive, formatted answer.
     */
    private static async synthesizeResponse(
        question: string,
        sql: string,
        queryResult: any[],
        scope: AccessibleOrganizationScope,
        executionTimeMs: number
    ): Promise<AiAnalyticsResponse> {
        // Safely stringify BigInt values from PostgreSQL
        const safeData = JSON.stringify(queryResult, (_, v) => typeof v === "bigint" ? Number(v) : v);

        const prompt = `You are the EduBridge EMIS Executive AI Assistant for the Ethiopian Educational Governance System.
You are responding to an educational official at the ${scope.currentOrganizationType} level (${scope.currentOrganization.name}).

User Question: "${question}"
Executed SQL: ${sql}
Live Database Result (JSON): ${safeData}

Synthesize a professional, concise, executive answer based strictly on the query result.
If the result is a list/table (e.g. schools, regions, or counts), extract up to 10 rows for a structured table display.
Provide 3 relevant follow-up questions the administrator might want to ask next.

Return ONLY a valid JSON object matching this TypeScript structure (NO markdown code fences, NO extra text):
{
  "summary": "Direct, clear answer to the user question in 1-3 sentences",
  "keyMetrics": [
    { "label": "Metric title", "value": "123" }
  ],
  "tableData": {
    "headers": ["School Name", "Region", "Teacher Count"],
    "rows": [["School A", "Addis Ababa", 42]]
  },
  "suggestedFollowUps": [
    "Relevant follow up question 1",
    "Relevant follow up question 2",
    "Relevant follow up question 3"
  ]
}
If no table is appropriate (e.g., simple single count or total), omit tableData.`;

        let jsonText = "";
        try {
            jsonText = await this.generateContentWithFallback(prompt);
        } catch (synthErr) {
            console.warn("[AiAnalytics] Synthesis model error, falling back to direct data serialization:", synthErr);
            return {
                question,
                summary: `Analysis completed: Retrieved ${queryResult.length} institutional record${queryResult.length === 1 ? "" : "s"} from the national database.`,
                keyMetrics: queryResult.length > 0 && typeof queryResult[0] === "object"
                    ? Object.entries(queryResult[0]).slice(0, 3).map(([k, v]) => ({ label: k, value: String(v) }))
                    : [],
                tableData: queryResult.length > 0 && typeof queryResult[0] === "object"
                    ? {
                        headers: Object.keys(queryResult[0]),
                        rows: queryResult.slice(0, 10).map(r => Object.values(r))
                    }
                    : undefined,
                suggestedFollowUps: [
                    "How many schools have below 100 teachers?",
                    "What is total student enrollment by region?",
                    "List all active regional administrative units"
                ],
                sqlQuery: sql,
                scopeLevel: scope.currentOrganizationType,
                scopeName: scope.currentOrganization.name,
                executionTimeMs
            };
        }

        let jsonText = (response.text || "").trim();
        jsonText = jsonText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

        let parsed: any = {};
        try {
            parsed = JSON.parse(jsonText);
        } catch {
            parsed = {
                summary: jsonText || "Unable to parse structured synthesis.",
                suggestedFollowUps: [
                    "Show total schools count",
                    "List schools by region",
                    "Compare teacher enrollment"
                ]
            };
        }

        return {
            question,
            summary: parsed.summary || "Database query executed successfully.",
            keyMetrics: parsed.keyMetrics || [],
            tableData: parsed.tableData?.headers ? parsed.tableData : undefined,
            suggestedFollowUps: parsed.suggestedFollowUps || [],
            sqlQuery: sql,
            scopeLevel: scope.currentOrganizationType,
            scopeName: scope.currentOrganization.name,
            executionTimeMs
        };
    }

    /**
     * Primary entry point: Handles natural language queries, enforces scope,
     * executes safe SQL, and synthesizes answers.
     */
    static async processQuery(
        userId: string,
        question: string
    ): Promise<AiAnalyticsResponse> {
        if (!question || !question.trim()) {
            throw new Error("Question is required.");
        }

        const startTime = Date.now();

        // 1. Resolve user hierarchical scope
        const scope = await HierarchyScopeService.getAccessibleOrganizationScope(userId);

        // 2. Generate SQL from question with scope isolation
        let sql = await this.generateSql(question, scope);
        let queryResult: any[] = [];

        try {
            queryResult = await prisma.$queryRawUnsafe<any[]>(sql);
        } catch (dbErr: any) {
            console.warn("[AiAnalytics] First query attempt failed, retrying with error feedback:", dbErr.message);
            // Self-correction attempt
            sql = await this.generateSql(question, scope, dbErr.message);
            queryResult = await prisma.$queryRawUnsafe<any[]>(sql);
        }

        const executionTimeMs = Date.now() - startTime;

        // 3. Synthesize human-readable executive response
        return await this.synthesizeResponse(question, sql, queryResult, scope, executionTimeMs);
    }
}
