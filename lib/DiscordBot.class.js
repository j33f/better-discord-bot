require('dotenv').config();
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client } = require('discord.js');
const requireGlob = require('require-glob');
const { join } = require('path');

class DiscordBot {
  constructor({
    clientOptions = { intents: 8 },
    commandsDirPath = undefined,
    env = undefined,
    isDevMode = false,
    prefix = undefined } = {}
  ) {
    this.env = env || process.env;

    this.client = new Client(clientOptions);

    this.commandsDirPath = commandsDirPath || this.env.COMMANDS_DIR_PATH;
    this.isDevMode = isDevMode || Boolean(this.env.DEV_MODE);
    this.prefix = prefix || this.env.PREFIX || '!';

    this.commands = [];
    this.availableCommands = [];
    this.commandsHandlers = {};
    this.buttonsHandlers = [];

    console.log(`[DiscordBot] Dev mode: ${this.isDevMode}`);
  }

  async start() {
    if (this.commandsDirPath) {
      await this.discoverCommands();
    }
    await this.registerCommands();
    await this.registerListeners();
    await this.login();
  }

  addCommands(commands, handler) {
    commands.forEach(command => {
      this.commands.push(command);
    });
  }

  async discoverCommands() {
    const found = await requireGlob(join(this.commandsDirPath,'*.js'));
    Object.keys(found).forEach(key => {
      this.commands.push(found[key]);
    });
    this.availableCommands = this.commands.map(c => c.command);
  }

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
    const body = this.commands.filter(c => c.isSlashCommand).map(c => c.def.toJSON());

    try {
      await rest.put(
        route,
        { body },
      );
      console.log('[DiscordBot] Commands updated!', this.availableCommands);
    } catch (e) {
      console.error('[DiscordBot] Error during commands registration:', e);
    }
  }

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
      console.log(`[DiscordBot] Logged in as ${this.client.user.tag}!`, this.client.user.id);
    });
  }

  async login() {
    try {
      await this.client.login(this.env.BOT_TOKEN);
    } catch (e) {
      console.error(e);
    }
  }

  async handleInteraction(interaction) {
    if (interaction.user.bot && interaction.componentType !== 'BUTTON') return;

    if (interaction.componentType === 'BUTTON') {
      return this.handleButton(interaction);
    }

    console.log(`[DiscordBot] Handling interaction ${interaction} from user ${interaction.user.username}`, interaction);
    const handler = this.commandsHandlers[interaction.commandName];
    if (handler) {
      return handler(interaction);
    }
    throw new Error(`Command ${interaction.command} not found`);
  }

  async handleButton(interaction) {
    console.log(`[DiscordBot] Handling button ${interaction.customId} from user ${interaction.user.username}`, interaction);
    console.log(this.buttonsHandlers);
    interaction.originGuild = this.client.guilds.cache.get(this.env.GUILD_ID);
    const result = await Promise.allSettled(this.buttonsHandlers.map(h => h(interaction)));
    const val = 0;
    if (result.reduce((p, c) => p + c, val) === 0) {
      throw new Error(`Cannot handle button ${interaction.customId}`);
    }
  }

  async handleMessage(message) {
    if (message.author.bot) return;

    if (message.content.startsWith(this.prefix)) {
      // handle message commands
      const command = message.content.slice(this.prefix.length).split(' ')[0];
      const handler = this.commandsHandlers[command];
      if (handler) {
        return handler(message);
      }
    }
    // handle direct conversations
    if (this.isToMe(message)) {
      const words = message.content.toLowerCase().replace(/[,;.:!]/g, '').split(' ');
      const foundCommands = words.filter(w => this.availableCommands.includes(w));
      if (foundCommands.length === 0) {
        // TODO handler no command messages
        console.log(`[DiscordBot] Message ${message.content} from user ${message.author.username}`, message, message.mentions);
        return message.reply({ content: 'http://sayitwithcaptions.com/wp-content/uploads/2020/10/You-talkin-to-me-1.jpg' });
      }
      if (foundCommands.length === 1) {
        const command = foundCommands[0];
        const handler = this.commandsHandlers[command];
        if (handler) {
          message.originGuild = this.client.guilds.cache.get(this.env.GUILD_ID);
          return handler(message);
        }
      }
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

    // when someone mentions just my name (without @)
    if (this.isMention(message)) {
      console.log(`[DiscordBot] Mention ${message.content} from user ${message.author.username}`, message, message.mentions);
      return message.reply('http://sayitwithcaptions.com/wp-content/uploads/2021/02/Quoi.png');
    }
  }

  isToMe(message) {
    return message.mentions.users.has(this.client.user.id);
  }

  isMention(message) {
    return message.content.split(' ').some(w => w.toLowerCase() === this.client.user.username.toLowerCase());
  }
}

module.exports = DiscordBot;