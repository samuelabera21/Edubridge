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
        url: "http://localhost:5000",
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
      { name: "Authorization" },
      { name: "School" },
      { name: "Academic" },
      { name: "Students" },
      { name: "Teachers" },
      { name: "Timetable" },
      { name: "Attendance" },
      { name: "Assessment" },
      { name: "Learning" },
      { name: "Support" },
      { name: "Parents" },
      { name: "Communication" },
      { name: "Operations" },
    ],
  },
  apis: ["./src/modules/**/*.routes.ts", "./src/modules/**/*.ts"], 
};

export const swaggerSpec = swaggerJsdoc(options);
