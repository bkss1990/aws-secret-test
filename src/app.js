import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { swaggerSpec, swaggerUi } from './swagger/swagger.js';
import healthRouter from './routes/health.js';
import secretsRouter from './routes/secrets.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Documentation'
}));

// API routes
app.use('/health', healthRouter);
app.use('/secrets', secretsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AWS Secrets Manager API',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
});

export default app;
