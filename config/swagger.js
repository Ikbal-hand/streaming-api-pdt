// config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const swaggerOptions = {
  // Gunakan ini untuk membaca dari file YAML
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Streaming Service Metadata Platform API',
      version: '1.0.0',
      description: 'A comprehensive backend system...',
      contact: {
        name: 'Logan',
        url: 'https://example.com',
        email: 'contact@example.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api/v1`,
        description: 'Development server (Localhost)',
      },
    ],
  },
  // --- UBAH PATH INI KE FILE YAML ---
  apis: ['./swagger-docs.yaml'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;