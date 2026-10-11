import { createLogger } from '@mbr/logger';
import { createUsersServer } from './app.js';

const logger = createLogger('users-api');
const port = Number(process.env.PORT ?? 3001);

createUsersServer(logger).listen(port, () => logger.info('listening', { port }));
