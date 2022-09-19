import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DiscordBot } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
  commandsDirPath: join(__dirname, 'commands'),
  prefix: '+!',
};

const bot = new DiscordBot(options);

bot.start();
