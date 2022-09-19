import { EventEmitter, captureRejectionSymbol } from 'node:events';

import { REST } from '@discordjs/rest';
import { GatewayIntentBits, Client, Partials, Routes } from 'discord.js';
import * as dotenv from 'dotenv';

import Command from './Command.js';
import Logger from './Logger.js';
import UnifiedInteraction from './UnifiedInteraction.js';
import importGlob from './utils/importGlob.js';

dotenv.config();
const intents = [];
for (const key in GatewayIntentBits) {
  intents.push(GatewayIntentBits[key]);
}

const talkingToMeDefault = 'Are you talking to me ?';

class DiscordBot extends EventEmitter {
  constructor({
    discordClientOptions = { intents, partials: [Partials.Channel] },
    commandsDirPath = process.env.COMMANDS_DIR_PATH,
    autoDiscoverCommands = true,
    env = process.env,
    isDevMode = String(process.env.DEV_MODE).toLowerCase() === 'on',
    prefix = process.env.PREFIX,
    talkingToMeResponse = process.env.TALKING_TO_ME_RESPONSE,
    talkingAboutMeResponse = process.env.TALKING_ABOUT_ME_RESPONSE,
    useInternalLogger = true,
  }) {
    /**
     * @type DiscordBot
     * @param discordClientOptions {Object} Options to pass to the Discord.js client
     * @param commandsDirPath {String} Path to the directory containing the commands
     * @param env {Object} Environment variables
     * @param isDevMode {Boolean} If true, the bot is in dev mode (attached to only one guild)
     * @param prefix {String} Prefix to use for the commands
     * @param talkingToMeResponse {String} Response to send when the bot is mentioned
     * @param talkingAboutMeResponse {String} Response to send when the bot's name is mentioned within a message
     * @returns {DiscordBot}
     */
    super({ captureRejections: true });

    this.commandsDirPath = commandsDirPath;
    this.autoDiscoverCommands = autoDiscoverCommands;
    this.env = env;
    this.isDevMode = isDevMode || true;
    this.prefix = prefix || '!';
    this.talkingToMeResponse = talkingToMeResponse || talkingToMeDefault;
    this.talkingAboutMeResponse = talkingAboutMeResponse || talkingToMeDefault;

    this.commands = [];
    this.slashCommands = new Set([]);
    this.messageCommands = new Set([]);
    this.buttonsHandheld = new Set([]);
    this.mentionHandlers = new Set([]);
    this.messageHandlers = new Set([]);
    this.dmHandlers = new Set([]);

    this.useInternalLogger = useInternalLogger;

    this.client = new Client(discordClientOptions);
  }

  log(level, ...args) {
    /**
     * @param level {String} Type of log
     * @param args {Array}
     * @returns {void}
     * @emits log
     */
    this.emit('log', { level, message: args.flat() });
  }

  info(...args) {
    this.log('info', args);
  }

  warn(...args) {
    this.log('warn', args);
  }

  error(...args) {
    this.log('error', args);
  }

  debug(...args) {
    this.log('debug', args);
  }

  [captureRejectionSymbol](err, event, ...args) {
    /**
     * Capture rejections from async listeners
     * @private
     * @param err {Error}
     * @param event {String}
     * @param args {Array}
     */
    this.log('rejection happened for', event, 'with', err, args);
    this.client.destroy();
  }

  async start() {
    /**
     * @returns {Promise<void>}
     */
    if (this.useInternalLogger) {
      this.logger = new Logger(this);
    }

    this.info('Bot is starting...');
    this.info('Prefix is', this.prefix);
    this.info('Dev mode is', this.isDevMode ? 'on' : 'off');

    await this._discoverCommands();
    this._prepareCommands();
    await this._registerCommands();
    this._registerListeners();
    await this.login();
  }

  async login() {
    /**
     * @returns {Promise<string>}
     */
    try {
      await this.client.login(this.env.BOT_TOKEN);
    } catch (e) {
      this.error(e);
    }
  }

  addCommand(commandDefinition) {
    /**
     * @param commandDefinition {Command} Command to add
     * @returns {void}
     */
    this.commands.push(new Command({ ...commandDefinition, bot: this }));
  }

  addCommands(commandsDefinitions) {
    /**
     * @param commandsDefinitions {Array<Command>} Commands to add
     * @returns {void}
     */
    commandsDefinitions.forEach(commandDefinition => {
      this.addCommand(commandDefinition);
    });
  }

  async _discoverCommands() {
    /**
     * @private
     * @returns {Promise<void>}
     */
    if (!this.autoDiscoverCommands) {
      this.info('Auto-discover commands is disabled');
      return;
    }

    try {
      this.info('Auto-discovering commands from', this.commandsDirPath, '...');
      const found = await importGlob(this.commandsDirPath, this);
      this.info('Discovered', Object.keys(found).length, 'commands');
      this.addCommands(found);
    } catch (e) {
      this.error(`Error while discovering commands: ${e.message}`);
      throw e;
    }
  }

  _prepareCommands() {
    /**
     * @private
     * @returns {void}
     */
    if (this.commands.length === 0) {
      this.info('This bot has no commands');
      return;
    }

    this.commands.forEach(command => {
      if (command.isSlashCommand) {
        this.slashCommands.add(command.name);
      }
      if (command.isMessageCommand) {
        this.messageCommands.add(command.name);
      }
      if (command.mentionHandler) {
        this.mentionHandlers.add(command.name);
      }
      if (command.messageHandler) {
        this.messageHandlers.add(command.name);
      }
      if (command.dmHandler) {
        this.dmHandlers.add(command.name);
      }
      if (command.buttonsHandheld.length > 0) {
        this.buttonsHandheld = new Set([...this.buttonsHandheld, ...command.buttonsHandheld]);
      }
    });
  }

  async _registerCommands() {
    /**
     * @private
     * @throws
     * @returns {Promise<void>}
     */
    const rest = new REST().setToken(this.env.BOT_TOKEN);
    const route = this.isDevMode ?
      Routes.applicationGuildCommands(this.env.CLIENT_ID, this.env.GUILD_ID)
      : Routes.applicationCommands(this.env.CLIENT_ID);
    const body = this.commands.filter(c => c.isSlashCommand).map(c => c.def);
    if (body.length === 0) {
      this.info('No slash commands to register');
      return;
    }
    try {
      await rest.put(
        route,
        { body },
      );
      this.info('Slash Commands registered to Discord!');
      if (!this.isDevMode) {
        this.warn('!!! You may have to wait about 20 to 30 minutes for those commands to be available to everyone');
      }
      this.info('Slash Commands:',
        this.slashCommands.size > 0 ? Array.from(this.slashCommands).join(', ') : 'none');
      this.info('Message Commands:',
        this.messageCommands.size > 0 ? Array.from(this.messageCommands).join(', ') : 'none');
      this.info('Handheld Buttons:',
        this.buttonsHandheld.size > 0 ? Array.from(this.buttonsHandheld).join(', ') : 'none');
      this.info('Mentions Handlers:',
        this.mentionHandlers.size > 0 ? Array.from(this.mentionHandlers).join(', ') : 'none');
      this.info('Message Handlers:',
        this.messageHandlers.size > 0 ? Array.from(this.messageHandlers).join(', ') : 'none');
      this.info('DM Handlers:',
        this.dmHandlers.size > 0 ? Array.from(this.dmHandlers).join(', ') : 'none');
    } catch (e) {
      throw new Error(`Error during commands registration: ${e.message}`);
    }
  }

  _registerListeners() {
    /**
     * @private
     * @returns {void}
     */
    this.client.once('ready', () => {
      this.info(`Logged in as ${this.client.user.tag}!`, 'with id:', this.client.user.id);
      this.info('Ready!\n\n');
    });

    const errorContent = 'Oh no... Something went wrong...';

    this.client.on('interactionCreate', async interaction => {
      try {
        await this._handleInteraction(interaction);
      } catch (e) {
        this.error(e);
        await interaction.reply({ content: errorContent, ephemeral: true });
      }
    });

    this.client.on('messageCreate', async interaction => {
      try {
        await this._handleInteraction(interaction);
      } catch (e) {
        this.error(e);
        await interaction.reply({ content: errorContent });
      }
    });

    this.on('error', error => {
      this.error('An uncaught error occurred:', error.message);
      this.error(error.stack);
      this.client.destroy();
    });
  }

  async _handleInteraction(interaction) {
    /**
     * @private
     * @param interaction {any} Interaction to handle
     * @returns {Promise<void>}
     */

    let interactionObject;
    if (interaction.partial) {
      const fullInteraction = await interaction.fetch();
      interactionObject = new UnifiedInteraction(fullInteraction, this);
    } else {
      interactionObject = new UnifiedInteraction(interaction, this);
    }

    if (interactionObject.isFromBot) {
      if (interactionObject.isFromMe) return;
      this.info('Ignoring interaction from a bot', interactionObject.author.userId);
      return;
    }

    const { eventName } = interactionObject;
    const rootEvent = eventName.split(':')[0];
    this.emit(rootEvent, interactionObject);

    if (eventName) {
      this.info('Interaction received:', eventName);
      this.emit(eventName, interactionObject);
      return;
    }

    this.info('Ignoring interaction');
  }
}

export default DiscordBot;
