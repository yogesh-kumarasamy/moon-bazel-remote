import { createLogger } from '@mbr/logger';
import { createOrdersServer } from './app.js';

const logger = createLogger('orders-api');
const port = Number(process.env.PORT ?? 3002);

createOrdersServer(logger).listen(port, () => logger.info('listening', { port }));
