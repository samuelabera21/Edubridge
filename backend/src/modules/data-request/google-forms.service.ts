import { google } from "googleapis";
import fs from "node:fs";
import path from "node:path";

export interface GoogleFormFieldInput {
    id: string;
    label: string;
    fieldType: "SHORT_TEXT" | "LONG_TEXT" | "NUMBER" | "YES_NO" | "DATE" | "SINGLE_SELECT" | "MULTI_SELECT";
    required?: boolean;
    description?: string;
    options?: string[];
    order?: number;
}

export interface GoogleFormCreationResult {
    googleFormId: string;
    formUrl: string;       // Admin / Edit URL (https://docs.google.com/forms/d/.../edit)
    responderUri: string;  // Public view/fill URL (https://docs.google.com/forms/d/e/.../viewform)
    fieldItemMap: Record<string, string>; // Maps EduBridge fieldId -> Google Form Item ID
}

export interface GoogleFormResponseItem {
    responseId: string;
    createTime: string;
    lastSubmittedTime: string;
    respondentEmail?: string;
    answers: Record<string, any>; // fieldLabel or fieldId -> string | string[] | number | boolean
}

export class GoogleFormsService {
    private static oauth2Client: any = null;
    private static tokenFilePath = path.resolve(process.cwd(), ".google_tokens.json");

    /**
     * Helper to load saved tokens from disk.
     */
    private static loadSavedTokens(): any {
        try {
            if (fs.existsSync(this.tokenFilePath)) {
                const data = fs.readFileSync(this.tokenFilePath, "utf8");
                return JSON.parse(data);
            }
        } catch (err) {
            console.warn("[GoogleFormsService] Failed to read token file:", err);
        }
        return null;
    }

    /**
     * Helper to save tokens to disk.
     */
    static saveTokens(tokens: any) {
        try {
            const existing = this.loadSavedTokens() || {};
            const merged = { ...existing, ...tokens };
            fs.writeFileSync(this.tokenFilePath, JSON.stringify(merged, null, 2), "utf8");
            console.log("[GoogleFormsService] Google OAuth tokens persisted successfully.");
        } catch (err) {
            console.warn("[GoogleFormsService] Failed to persist token file:", err);
        }
    }

    /**
     * Initializes or returns Google OAuth2 Client instance.
     */
    static getOAuth2Client() {
        if (this.oauth2Client) return this.oauth2Client;

        const clientId = process.env.GOOGLE_CLIENT_ID || "";
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
        const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/data-requests/google-oauth/callback";

        this.oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );

        // Load tokens from disk or environment
        const diskTokens = this.loadSavedTokens();
        const refreshToken = diskTokens?.refresh_token || process.env.GOOGLE_REFRESH_TOKEN;
        const accessToken = diskTokens?.access_token || process.env.GOOGLE_ACCESS_TOKEN;

        if (refreshToken || accessToken) {
            this.oauth2Client.setCredentials({
                refresh_token: refreshToken,
                access_token: accessToken,
                ...diskTokens
            });
        }

        // Auto-persist refreshed tokens
        this.oauth2Client.on("tokens", (newTokens: any) => {
            this.saveTokens(newTokens);
        });

        return this.oauth2Client;
    }

    /**
     * Check if Google API client ID and secret are configured in environment.
     */
    static isConfigured(): boolean {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        return Boolean(
            clientId &&
            clientSecret &&
            !clientId.includes("placeholder") &&
            !clientId.includes("your-google-client-id")
        );
    }

    /**
     * Check if active access or refresh tokens are currently available.
     */
    static hasAuthorizedTokens(): boolean {
        const client = this.getOAuth2Client();
        const creds = client.credentials;
        return Boolean(creds?.access_token || creds?.refresh_token);
    }

    /**
     * Generates Google OAuth 2.0 Authorization URL for administrator consent.
     */
    static getAuthUrl(state?: string): string {
        const oauth2Client = this.getOAuth2Client();
        const scopes = [
            "https://www.googleapis.com/auth/forms.body",
            "https://www.googleapis.com/auth/forms.responses.readonly",
            "https://www.googleapis.com/auth/drive.metadata.readonly"
        ];

        return oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: scopes,
            state
        });
    }

    /**
     * Handles OAuth callback code exchange for tokens.
     */
    static async handleOAuthCallback(code: string) {
        const oauth2Client = this.getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        this.saveTokens(tokens);
        return tokens;
    }

    /**
     * Sets access and refresh tokens directly.
     */
    static setCredentials(tokens: { access_token?: string; refresh_token?: string }) {
        const oauth2Client = this.getOAuth2Client();
        oauth2Client.setCredentials(tokens);
        this.saveTokens(tokens);
    }

    /**
     * Dynamically creates an authoritative Google Form using the Google Forms API.
     * Maps dynamic EduBridge field definitions to Google Forms question types.
     */
    static async createGoogleForm(params: {
        title: string;
        description?: string;
        fields: GoogleFormFieldInput[];
    }): Promise<GoogleFormCreationResult> {
        const { title, description = "", fields } = params;
        const isLive = this.isConfigured();

        if (isLive) {
            if (!this.hasAuthorizedTokens()) {
                throw new Error("Google OAuth account is not connected yet. Please click 'Connect Google' in the Data Request page first to authorize Google Forms creation.");
            }

            try {
                const auth = this.getOAuth2Client();
                const forms = google.forms({ version: "v1", auth });

                // 1. Create Initial Google Form
                const createRes = await forms.forms.create({
                    requestBody: {
                        info: {
                            title: title,
                            documentTitle: title
                        }
                    }
                });

                const formId = createRes.data.formId;
                if (!formId) {
                    throw new Error("Google Forms API failed to return a valid form ID.");
                }

                const responderUri = createRes.data.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`;
                const formUrl = `https://docs.google.com/forms/d/${formId}/edit`;

                // 2. Build BatchUpdate Requests for Description & Questions
                const requests: any[] = [];

                if (description) {
                    requests.push({
                        updateFormInfo: {
                            info: {
                                description: description
                            },
                            updateMask: "description"
                        }
                    });
                }

                // Add Identification question (School / Organization Identifier)
                requests.push({
                    createItem: {
                        item: {
                            title: "Respondent School / Organization Unit Name",
                            description: "Please enter your official School or Administrative Office Name",
                            questionItem: {
                                question: {
                                    required: true,
                                    textQuestion: {
                                        paragraph: false
                                    }
                                }
                            }
                        },
                        location: {
                            index: 0
                        }
                    }
                });

                // Map EduBridge Dynamic Fields to Google Forms Questions
                fields.forEach((field, idx) => {
                    const itemIndex = idx + 1;
                    const questionItem = this.mapFieldToGoogleQuestion(field);

                    requests.push({
                        createItem: {
                            item: {
                                title: field.label,
                                description: field.description || (field.fieldType === "NUMBER" ? "Please enter a numeric value" : undefined),
                                questionItem
                            },
                            location: {
                                index: itemIndex
                            }
                        }
                    });
                });

                // 3. Execute BatchUpdate
                const batchRes = await forms.forms.batchUpdate({
                    formId,
                    requestBody: {
                        requests
                    }
                });

                const fieldItemMap: Record<string, string> = {};
                const replies = batchRes.data.replies || [];

                // Match reply item IDs back to EduBridge field IDs
                fields.forEach((field, idx) => {
                    const replyIdx = description ? idx + 2 : idx + 1; // offset for description & school name
                    const reply = replies[replyIdx];
                    if (reply?.createItem?.itemId) {
                        fieldItemMap[field.id] = reply.createItem.itemId;
                    }
                });

                console.log(`[GoogleFormsService] Successfully created live Google Form with ID: ${formId}`);

                return {
                    googleFormId: formId,
                    formUrl,
                    responderUri,
                    fieldItemMap
                };
            } catch (err: any) {
                console.error("[GoogleFormsService] Google Forms API error:", err);
                throw new Error(`Google Forms API failed: ${err.message || err}`);
            }
        }

        // Development fallback mode only if Google credentials are not configured at all
        const simulatedId = `1FAIpQLSc_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString().slice(-4)}`;
        const formUrl = `https://docs.google.com/forms/d/${simulatedId}/edit`;
        const responderUri = `https://docs.google.com/forms/d/e/${simulatedId}/viewform`;

        const fieldItemMap: Record<string, string> = {};
        fields.forEach((f, idx) => {
            fieldItemMap[f.id] = `item_${idx + 1}_${f.id.slice(0, 6)}`;
        });

        return {
            googleFormId: simulatedId,
            formUrl,
            responderUri,
            fieldItemMap
        };
    }

    /**
     * Maps an EduBridge field definition to Google Forms API Question Item structure.
     */
    private static mapFieldToGoogleQuestion(field: GoogleFormFieldInput) {
        const required = Boolean(field.required);

        switch (field.fieldType) {
            case "SHORT_TEXT":
            case "NUMBER":
                return {
                    question: {
                        required,
                        textQuestion: {
                            paragraph: false
                        }
                    }
                };

            case "LONG_TEXT":
                return {
                    question: {
                        required,
                        textQuestion: {
                            paragraph: true
                        }
                    }
                };

            case "YES_NO":
                return {
                    question: {
                        required,
                        choiceQuestion: {
                            type: "RADIO",
                            options: [
                                { value: "Yes" },
                                { value: "No" }
                            ]
                        }
                    }
                };

            case "DATE":
                return {
                    question: {
                        required,
                        dateQuestion: {
                            includeYear: true,
                            includeTime: false
                        }
                    }
                };

            case "SINGLE_SELECT":
                return {
                    question: {
                        required,
                        choiceQuestion: {
                            type: "RADIO",
                            options: (field.options && field.options.length > 0
                                ? field.options
                                : ["Option 1", "Option 2"]
                            ).map(opt => ({ value: opt }))
                        }
                    }
                };

            case "MULTI_SELECT":
                return {
                    question: {
                        required,
                        choiceQuestion: {
                            type: "CHECKBOX",
                            options: (field.options && field.options.length > 0
                                ? field.options
                                : ["Option 1", "Option 2"]
                            ).map(opt => ({ value: opt }))
                        }
                    }
                };

            default:
                return {
                    question: {
                        required,
                        textQuestion: {
                            paragraph: false
                        }
                    }
                };
        }
    }

    /**
     * Synchronizes live responses from Google Forms API for a specific Google Form.
     * Automatically maps numerical Google question IDs to human question titles.
     */
    static async syncFormResponses(googleFormId: string, fields: GoogleFormFieldInput[]): Promise<GoogleFormResponseItem[]> {
        const isLive = this.isConfigured();

        if (isLive && this.hasAuthorizedTokens()) {
            try {
                const auth = this.getOAuth2Client();
                const forms = google.forms({ version: "v1", auth });

                // 1. Fetch form metadata to map question IDs / item IDs to human question titles
                const questionTitleMap: Record<string, string> = {};
                try {
                    const formMeta = await forms.forms.get({ formId: googleFormId });
                    const items = formMeta.data.items || [];
                    for (const item of items) {
                        const title = item.title || "";
                        if (item.itemId) {
                            questionTitleMap[item.itemId] = title;
                        }
                        if (item.questionItem?.question?.questionId) {
                            questionTitleMap[item.questionItem.question.questionId] = title;
                        }
                    }
                } catch (metaErr) {
                    console.warn("[GoogleFormsService] Failed to fetch form meta for title mapping:", metaErr);
                }

                // 2. Fetch responses
                const res = await forms.forms.responses.list({
                    formId: googleFormId
                });

                const rawResponses = res.data.responses || [];
                const parsedResponses: GoogleFormResponseItem[] = [];

                for (const r of rawResponses) {
                    const responseId = r.responseId || `resp_${Date.now()}`;
                    const createTime = r.createTime || new Date().toISOString();
                    const lastSubmittedTime = r.lastSubmittedTime || createTime;
                    const answers: Record<string, any> = {};

                    if (r.answers) {
                        for (const [questionId, answerObj] of Object.entries(r.answers)) {
                            const textAnswers = (answerObj as any).textAnswers?.answers || [];
                            const val = textAnswers.map((a: any) => a.value).join(", ");
                            const humanLabel = questionTitleMap[questionId] || questionId;
                            answers[humanLabel] = val;
                        }
                    }

                    parsedResponses.push({
                        responseId,
                        createTime,
                        lastSubmittedTime,
                        respondentEmail: r.respondentEmail || undefined,
                        answers
                    });
                }

                return parsedResponses;
            } catch (err: any) {
                console.error("[GoogleFormsService] Failed to sync live Google Form responses:", err.message);
                throw new Error(`Google Forms sync failed: ${err.message}`);
            }
        }

        return [];
    }
}
