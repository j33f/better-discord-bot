import { default as pino } from 'pino';
import { default as pinoPretty } from 'pino-pretty';

class Logger {
  constructor(bot) {
    const stream = pinoPretty({
      colorize: true,
      singleLine: true,
    });
    const logger = pino(stream);

    bot.on('log', ({ level, message }) => {
      logger[level](message.map(m => m.toString()).join(' '));
    });
  }
}

export default Logger;
