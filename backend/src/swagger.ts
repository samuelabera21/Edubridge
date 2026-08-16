import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EduBridge API",
      version: "1.0.0",
      description: "API Documentation for EduBridge School Domain Foundation",
    },
    servers: [
      {
        url: "/",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
        },
      },
    },
    security: [
      {
        cookieAuth: [],
      },
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: "Authentication" },
      { name: "Vice Principal" },
    ],
    paths: {
      "/api/auth/sign-in/email": {
        post: {
          tags: ["Authentication"],
          summary: "Sign In via Email",
          description: "Login with Better Auth to receive a session cookie.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successfully authenticated",
            },
            "401": {
              description: "Unauthorized",
            }
          },
        },
      },
    },
  },
  apis: ["./src/modules/**/*.ts", "./src/modules/**/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
