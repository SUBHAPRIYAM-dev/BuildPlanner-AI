import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';

async function bootstrap() {
  try {
    await connectDB();
    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`BuildPlanner AI API Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
    });

    const shutdown = async () => {
      logger.info('Shutting down server gracefully...');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error({ error }, 'Fatal error during API server bootstrap');
    process.exit(1);
  }
}

bootstrap();
