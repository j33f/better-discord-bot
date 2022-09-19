import { joinVoiceChannel } from '@discordjs/voice';
import User from './User.js';

class UnifiedInteraction {
  constructor(originalObject, bot) {
    const { options, content, locale, guildLocale, member, user, guild, author } = originalObject;

    this.bot = bot;
    this.options = options;
    this.content = content || '';
    this.locale = locale || guildLocale || 'default';
    this.author = new User({ member, user: user || author, guild });
    this.guild = guild;
    this.isDM = guild === null;
    this.channel = originalObject.channel;
    this.commandName = originalObject.commandName || undefined;
    this.isSlashCommand = Boolean(originalObject.commandName) || false;
    this.buttonId = originalObject.customId || undefined;
    this.replied = false;
    this.originalObject = originalObject;
  }

  get isButton() {
    if (this.originalObject.customId && typeof this.originalObject.isButton === 'function' && this.originalObject.isButton()) {
      return true;
    }
    return false;
  }

  get isMessageCommand() {
    if (!this.isSlashCommand && !this.isButton && this.content.startsWith(this.bot.prefix)) {
      const possibleCommand = this.content.slice(this.bot.prefix.length).split(' ')[0];
      if (this.bot.messageCommands.has(possibleCommand)) {
        this.commandName = possibleCommand;
        return true;
      }
    }
    return false;
  }

  get eventName() {
    switch (true) {
      case this.isButton:
        return `button:${this.buttonId}`;
      case this.isSlashCommand:
        return `slashCommand:${this.commandName}`;
      case this.isMessageCommand:
        return `messageCommand:${this.commandName}`;
      case this.isToMe || this.isMentioningMe:
        return 'mention';
      case this.isDM:
        return 'directMessage';
      case !this.isToMe && !this.isMentioningMe:
        return 'message';
      default:
        return undefined;
    }
  }

  get isFromBot() {
    return Boolean(this.author.isBot) || false;
  }

  get isFromMe() {
    return this.author.userId === this.bot.client.user.id;
  }

  get isToMe() {
    if (!this.originalObject.mentions) return false;
    return this.originalObject.mentions.users.has(this.bot.client.user.id);
  }

  get isMentioningMe() {
    return this.content.toLowerCase().includes(this.bot.client.user.username.toLowerCase());
  }

  defer() {
    if (this.originalObject.deferReply) {
      return this.originalObject.deferReply();
    }
    return Promise.resolve();
  }

  async reply({ content, components = [], ephemeral = false, edit = false }) {
    /**
     * @param content {string} the message content
     * @param components {any[]} an array of embeds
     * @param ephemeral {boolean} if the message should be ephemeral
     * @param edit {boolean} should we edit the message or create a "follow up"
     */
    try {
      this.replied = true;
      return await this.originalObject.reply({ content, components, ephemeral });
    } catch (e) {
      this.bot.debug('🤖 an error occured while trying to reply:', e.message);
      if (edit) {
        return this.originalObject.editReply({ content, components, ephemeral });
      } else {
        return this.originalObject.followUp({ content, components, ephemeral });
      }
    }
  }

  followUp({ content, embeds, ephemeral }) {
    /**
     * @param content {string} the message content
     * @param embeds {any[]}
     * @param ephemeral {boolean}
     */
    if (!this.replied) {
      return this.reply({ content, embeds, ephemeral });
    }
    return this.originalObject.followUp({ content, embeds, ephemeral });
  }

  async joinVocalChannel(name) {
    if (!this.guild || typeof name !== 'string') {
      return Promise.reject(
        new Error('You must be in a guild and provide a channel name to join a vocal channel'),
      );
    }

    const channels = await this.guild.channels.fetch();
    const chan = channels.find(c => c.name === name);
    if (!chan) {
      return Promise.reject(new Error(`Channel "${name}" not found in guild "${this.guild.name}"`));
    }

    const vocChan = await joinVoiceChannel({
      channelId: chan.id,
      guildId: chan.guild.id,
      adapterCreator: chan.guild.voiceAdapterCreator,
    });

    return { chan, vocChan };
  }
}

export default UnifiedInteraction;
