'use strict';
require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client } = require('discord.js');
const requireGlob = require('require-glob');
const { join } = require('path');

class DiscordBot {
  /**
   * The Discord Bot constructor
   * @param clientOptions {Object} The Discord.js client options
   * @param commandsDirPath {String} The path to the commands' directory (for autodiscovery)
   * @param env {Object} The environment variables
   * @param isDevMode {Boolean} Whether the bot is in dev mode
   * @param prefix {String} The non-slash command prefix
   * @param talkingToMeResponse {String} The default response to the mention of the bot
   * @param talkingAboutMeResponse {String} The default response to the mention of the bot (just mentioned the name)
   * @param directMessagesHandler {Function} The handler for direct messages
   * @param mentionsHandler {Function} The handler for messages which mention the bot name
   */
  constructor({
                clientOptions = { intents: 8 },
                commandsDirPath = undefined,
                env = undefined,
                isDevMode = false,
                prefix = undefined,
                talkingToMeResponse,
                talkingAboutMeResponse,
                directMessagesHandler = undefined,
                mentionsHandler = undefined,
              }) {
    this.env = env || process.env;

    this.client = new Client(clientOptions);

    this.commandsDirPath = commandsDirPath || this.env.COMMANDS_DIR_PATH;
    this.isDevMode = isDevMode || Boolean(this.env.DEV_MODE);
    console.info(`[DiscordBot] Dev mode: ${this.isDevMode}`);

    this.prefix = prefix || this.env.PREFIX || '!'
    console.info(`[DiscordBot] Commands prefix: ${this.prefix}`);

    this.talkingToMeResponse = talkingToMeResponse || this.env.TALKING_TO_ME_RESPONSE || 'Are you talking to me ?';
    this.talkingAboutMeResponse = talkingAboutMeResponse || this.env.TALKING_ABOUT_ME_RESPONSE || 'Are you talking about me ?';
    this.directMessagesHandler = directMessagesHandler || this.defaultDirectMessagesHandler;
    if (directMessagesHandler) {
      console.info('[DiscordBot] Direct messages handler registered');
    }
    this.mentionsHandler = mentionsHandler || this.defaultMentionsHandler;
    if (mentionsHandler) {
      console.info('[DiscordBot] Mention messages handler registered');
    }

    this.commands = [];
    this.availableCommands = [];
    this.commandsHandlers = {};
    this.buttonsHandlers = [];
  }

  /**
   * Performs the starting process when properly configured
   * @returns {Promise<void>}
   */
  async start() {
    if (this.commandsDirPath) { // autodiscover commands if path is provided
      await this.discoverCommands();
    }
    await this.registerCommands();
    await this.registerListeners();
    await this.login();
  }

  /**
   * Adds multiple commands to the list of available commands manually
   * @param commands
   */
  addCommands(commands) {
    commands.forEach(command => {
      this.commands.push(command);
    });
  }

  /**
   * Adds a command to the list of available commands manually
   * @param command
   */
  addCommand(command) {
    this.commands.push(command);
  }

  /**
   * Autodiscovers commands from the commands directory
   * @returns {Promise<void>}
   */
  async discoverCommands() {
    const found = await requireGlob(join(this.commandsDirPath,'*.js'));
    Object.keys(found).forEach(key => {
      this.commands.push(found[key]);
    });
    this.availableCommands = this.commands.map(c => c.command);
  }

  /**
   * Registers the slash commands to Discord & into the Bot
   * @returns {Promise<void>}
   */
  async registerCommands() {
    if (this.commands.length === 0) {
      console.info('[DiscordBot] No commands found');
      return;
    }
    this.commands.forEach(c => {
      this.commandsHandlers[c.command] = c.handler;
      this.buttonsHandlers.push(c.buttonsHandler);
    });

    const rest = new REST().setToken(this.env.BOT_TOKEN);
    const route = this.isDevMode ? Routes.applicationGuildCommands(this.env.CLIENT_ID, this.env.GUILD_ID) : Routes.applicationCommands(this.env.CLIENT_ID);
    const body = this.commands.filter(c => c.isSlashCommand).map(c => c.def); // register only slashes commands to Discord

    try {
      await rest.put(
        route,
        { body },
      );
      console.info('[DiscordBot] Commands updated!', this.availableCommands);
    } catch (e) {
      console.error('[DiscordBot] Error during commands registration:', e);
    }
  }

  /**
   * Registers the listeners for interactions and messages
   * @returns {Promise<void>}
   */
  async registerListeners() {
    const content = 'Something went wrong...';
    this.client.on('interactionCreate', async (interaction) => {
      try {
        await this.handleInteraction(interaction);
      } catch (e) {
        console.error(e);
        await interaction.reply({ content });
      }
    });
    this.client.on('messageCreate', async (message) => {
      try {
        await this.handleMessage(message);
      } catch (e) {
        console.error(e);
        await message.reply({ content });
      }
    });
    this.client.once('ready', () => {
      console.info(`[DiscordBot] Logged in as ${this.client.user.tag}!`, 'with id:', this.client.user.id);
    });
  }

  /**
   * Login the bot to Discord
   * @returns {Promise<void>}
   */
  async login() {
    try {
      await this.client.login(this.env.BOT_TOKEN);
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Handles all the interactions
   * @param interaction
   * @returns {Promise<void|*>}
   */
  async handleInteraction(interaction) {
    // avoid interactions from bots which are not buttons clicks
    if (interaction.user.bot && interaction.componentType !== 'BUTTON') return;

    // Someone clicked on a button
    if (interaction.componentType === 'BUTTON') {
      return this.handleButton(interaction);
    }

    // we have a slash command !
    console.log('[DiscordBot] --------------------------');
    console.log('[DiscordBot] Interaction:', interaction);
    console.log(`[DiscordBot] Handling interaction ${interaction} from user ${interaction.user.username}`);
    const handler = this.commandsHandlers[interaction.commandName];
    if (handler) {
      return handler(interaction);
    }
    throw new Error(`Command ${interaction.command} not found`);
  }

  /**
   * Handles buttons interactions
   * @param interaction
   * @returns {Promise<void>}
   */
  async handleButton(interaction) {
    console.log('[DiscordBot] --------------------------');
    console.log('[DiscordBot] Interaction:', interaction);
    console.log(`[DiscordBot] Handling button ${interaction.customId} from user ${interaction.user.username}`);
    // inject Guild infos into the interaction object, so we can use it in the handler
    interaction.originGuild = this.client.guilds.cache.get(this.env.GUILD_ID);
    /*
      As Buttons can be handled by multiple commands, we need to find the right handler for it.
      To do so, we execute all handlers and check if the interaction is handled by one of them.
      All the handlers are executed in the order they were registered.
      All the handlers are promises, so we need to wait for them to be settled.
      The handlers respond with 1 if the interaction is handled, 0 otherwise.
      To know if the buttons is handled, we check if at least one handler returns 1.
     */
    const result = await Promise.allSettled(this.buttonsHandlers.map(h => h(interaction)));
    if (result.every(r => r.value === 0)) {
      console.error(`Cannot handle button ${interaction.customId}`);
    }
  }

  /**
   * Handles all the messages (which are not interactions / slashes commands / buttons)
   * @param message
   * @returns {Promise<*>}
   */
  async handleMessage(message) {
    if (message.author.bot) return; // ignore messages from bots

    // handle custom commands (ones starting with a prefix)
    if (message.content.startsWith(this.prefix)) {
      // handle message commands and treat them as slash commands
      const command = message.content.slice(this.prefix.length).split(' ')[0];
      const handler = this.commandsHandlers[command];
      if (handler) {
        return handler(message);
      }
    }
    // handle direct conversations
    if (this.isToMe(message)) {
      // one user have mentioned the Bot !
      const words = message.content.toLowerCase().replace(/[,;.:!]/g, '').split(' ');
      const foundCommands = words.filter(w => this.availableCommands.includes(w));
      if (foundCommands.length === 0) {
        // no command found in the message
        await this.directMessagesHandler(message);
      }

      // we have a command ! (only one) : just treat it as a normal command
      if (foundCommands.length === 1) {
        const command = foundCommands[0];
        const handler = this.commandsHandlers[command];
        if (handler) {
          message.originGuild = this.client.guilds.cache.get(this.env.GUILD_ID);
          return handler(message);
        }
      }
      // we have multiple commands ! execute them one by one
      // TODO maybe find a better way to do this
      if (foundCommands.length > 1) {
        let handheld = false;
        foundCommands.forEach(command => {
          const handler = this.commandsHandlers[command];
          if (handler) {
            handheld = true;
            handler(message);
          }
        });
        if (handheld) return;
      }
    }

    // someone wrote the bot name but without mentioning it directly
    if (this.isMention(message)) {
      await this.mentionsHandler(message);
    }

    // TODO handle other messages not addressed to the bot nor quoting it
  }

  /**
   * Check if the message is addressed to the bot (mentionned with @)
   * @param message {Message} - the message to check
   * @returns {boolean}
   */
  isToMe(message) {
    return message.mentions.users.has(this.client.user.id);
  }

  /**
   * Check if the message is a mention of the bot (mentionned without @)
   * @param message {Message} - the message to check
   * @returns {boolean}
   */
  isMention(message) {
    return message.content.split(' ').some(w => w.toLowerCase() === this.client.user.username.toLowerCase());
  }

  /**
   *
   * @param message
   * @returns {*}
   */
  async defaultDirectMessagesHandler(message) {
    console.log(`[DiscordBot] Message ${message.content} from user ${message.author.username}`, message, message.mentions);
    await message.reply({ content: this.talkingToMeResponse });
  }

  async defaultMentionsHandler(message) {
    console.log(`[DiscordBot] Mention ${message.content} from user ${message.author.username}`, message, message.mentions);
    return message.reply({ content: this.talkingAboutMeResponse });
  }
}

module.exports = DiscordBot;