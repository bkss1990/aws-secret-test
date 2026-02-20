import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AWS Secrets Manager API',
      version: '1.0.0',
      description: 'Express.js backend API with AWS Secrets Manager integration',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Secrets',
        description: 'AWS Secrets Manager endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/app.js'] // Path to the API files
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerSpec, swaggerUi };
