import { SlashCommandBuilder } from '@discordjs/builders';

class Command {
  constructor({
    name,
    description,
    commandHandler,
    buttonsHandler,
    mentionHandler,
    messageHandler,
    dmHandler,
    isSlashCommand = true,
    isMessageCommand = true,
    acceptDM = false,
    requiredRoles = [],
    requireAllRoles = false,
    requiredRolesErrorMessage = 'You do not have the required roles to use this command.',
    options = [],
    buttonsHandheld = [],
    requiredPermissions = [],
    bot,
  }) {
    /**
     * @type {Command}
     * @param name {String} Name of the command
     * @param description {String} Description of the command
     * @param commandHandler {Function | undefined} Function to execute when the command is called
     * @param buttonsHandler {Function | undefined} Function to execute when a button is clicked
     * @param mentionHandler {Function | undefined} Function to execute when the bot is mentioned
     * @param messageHandler {Function | undefined} A function to execute when a message is received
     * @param dmHandler {Function | undefined} A function to execute when a message is received in DM
     * @param isSlashCommand {Boolean} If true, the command is a slash command
     * @param isMessageCommand {Boolean} If true, the command is a message command
     * @param requiredRoles {Array<string>} Array of roles required to execute the command
     * @param requireAllRoles {Boolean} If true, all roles in requiredRoles are required
     * @param requiredRolesErrorMessage {String} Error message to display if the user doesn't have the required roles
     * @param options {Array} Array of options for the command
     * @param buttonsHandheld {Array<string>} Array of buttons names to handle
     * @param requiredPermissions {Array<number>} Array of permissions required to execute the command
     * @param bot {DiscordBot} DiscordBot instance
     */
    this.bot = bot;
    this.name = name.toLowerCase();
    this.description = description;
    this.commandHandler = commandHandler;
    this.buttonsHandler = buttonsHandler;
    this.mentionHandler = mentionHandler;
    this.messageHandler = messageHandler;
    this.dmHandler = dmHandler;
    this.isSlashCommand = isSlashCommand;
    this.isMessageCommand = isMessageCommand;
    this.acceptDM = acceptDM;
    this.requiredRoles = requiredRoles;
    this.requireAllRoles = requireAllRoles;
    this.requiredRolesErrorMessage = requiredRolesErrorMessage;
    this.options = options;
    this.buttonsHandheld = buttonsHandheld;
    this.requiredPermissions = requiredPermissions.reduce((acc, permission) => acc | permission, 0);

    this._check();

    this._def = new SlashCommandBuilder();
    this._def.setName(this.name)
      .setDescription(this.description)
      .setDMPermission(this.acceptDM)
      .setDefaultMemberPermissions(this.requiredPermissions);

    this._addOptions();

    this._listen();
  }

  get def() {
    /**
     * @type {SlashCommandBuilder}
     */
    return this._def.toJSON();
  }

  _check() {
    /**
     * @private
     * @throws
     */
    if (!this.name) {
      throw new Error(`A command must have a name...`);
    }
    if (!this.description) {
      throw new Error(`Command ${this.name} must have a description`);
    }

    if (this.buttonsHandheld
      && (
        !Array.isArray(this.buttonsHandheld)
        || this.buttonsHandheld.filter(button => typeof button !== 'string').length > 0
      )
    ) {
      this.bot.warn('You must provide an array of buttons names to handle '
        + `(got ${typeof this.buttonsHandheld} instead) in ${this.name}`);
      this.buttonsHandheld = [];
    }

    if (this.buttonsHandheld.length > 0 && typeof this.buttonsHandler !== 'function') {
      this.bot.warn('You must provide a buttonsHandler '
      + `function if you want to handle buttons in command ${this.name}`);
      this.buttonsHandheld = [];
    }

    if (this.buttonsHandheld.length === 0 && typeof this.buttonsHandler === 'function') {
      this.bot.warn(`You have to declare which buttons the command "${this.name}" handles`);
    }

    if ((this.isSlashCommand || this.isMessageCommand) && typeof this.commandHandler !== 'function') {
      this.bot.warn(`The "${this.name}" command must have a commandHandler function`);
    }
  }

  _addOptions() {
    /**
     * @private
     * @throws
     */
    this.options.forEach(option => {
      if (typeof option.handler !== 'function') {
        throw new Error(`[DiscordBot] The option "${option.name}" of the command "${this.name}" `
        + 'must have a handler function');
      }

      switch (String(option.type).toLowerCase()) {
        case 'attachment':
          this._def.addAttachmentOption(option.handler);
          break;
        case 'boolean':
          this._def.addBooleanOption(option.handler);
          break;
        case 'channel':
          this._def.addChannelOption(option.handler);
          break;
        case 'integer':
          this._def.addIntegerOption(option.handler);
          break;
        case 'number':
        case 'decimal':
          this._def.addNumberOption(option.handler);
          break;
        case 'mentionable':
          this._def.addMentionableOption(option.handler);
          break;
        case 'string':
          this._def.addStringOption(option.handler);
          break;
        case 'user':
          this._def.addUserOption(option.handler);
          break;
        case 'role':
          this._def.addRoleOption(option.handler);
          break;
        default:
          throw new Error(`[DiscordBot] Unknown option type while declaring command ${this.name}`);
      }
    });
  }

  _listen() {
    /**
     * @private
     */

    let listnening = false;

    if (this.buttonsHandheld.length > 0) {
      this.buttonsHandheld.forEach(buttonId => {
        this.bot.on(`button:${buttonId}`,
          interaction => this._listenerWrapper(
            'Button handler', interaction, this.buttonsHandler, `via button: "${buttonId}"`,
          ));
      });
    }

    if (this.isSlashCommand) {
      listnening = true;
      this.bot.on(`slashCommand:${this.name}`,
        interaction => {
          const comment = `${interaction.isDM ?
            'in DM' : `in channel ${interaction.guild.name}/${interaction.channel.name}`}`;

          return this._listenerWrapper('Slash Command', interaction, this.commandHandler, comment);
        });
    }

    if (this.isMessageCommand) {
      listnening = true;
      this.bot.on(`messageCommand:${this.name}`,
        interaction => {
          const comment = `${interaction.isDM ?
            'in DM' : `in channel ${interaction.guild.name}/${interaction.channel.name}`}`;
          return this._listenerWrapper(
            'Message Command', interaction, this.commandHandler, comment,
          );
        });
    }

    if (typeof this.messageHandler === 'function') {
      listnening = true;
      this.bot.on('message', interaction => this._listenerWrapper(
        'Message Handler', interaction, this.messageHandler, 'via message',
      ));
    } else if (this.messageHandler) {
      this.bot.warn(`mentionHandler is not a function in command ${this.name}! Ignored.`);
    }

    if (typeof this.mentionHandler === 'function') {
      listnening = true;
      this.bot.on('mention', interaction => this._listenerWrapper(
        'Mention Handler', interaction, this.mentionHandler, 'via message',
      ));
    } else if (this.mentionHandler) {
      this.bot.warn(`mentionHandler is not a function in command ${this.name}! Ignored.`);
    }

    if (typeof this.dmHandler === 'function') {
      listnening = true;
      this.bot.on('directMessage', interaction => this._listenerWrapper(
        'DM Handler', interaction, this.dmHandler, '',
      ));
    } else if (this.dmHandler) {
      this.bot.warn(`dmHandler is not a function in command ${this.name}! Ignored.`);
    }

    if (!listnening) {
      this.bot.warn(`Command ${this.name} is not handling anything!`);
    }
  }

  _listenerWrapper(eventType, interaction, handler, comment) {
  /**
   * @private
   * @param eventType {string} Event name
   * @param interaction {UnifiedInteraction} the interaction
   * @param handler {Function} the command handler
   * @param comment {String} comment to add to the log
   * @returns {Promise<void>}
   */
    this.bot.info(`${eventType} "${this.name}" triggered by <@${interaction.author.userId}> ${comment}`);
    if (!this._checkRequiredRoles(interaction)) {
      return interaction.reply({
        content: this.requiredRolesErrorMessage,
        ephemeral: true,
      });
    }
    try {
      return handler(interaction);
    } catch (e) {
      this.bot.error('Error while executing command', this.name, e.message);
      this.bot.error('Interaction Object:', interaction);
      this.bot.error(e);
      return interaction.reply({
        content: 'An error occurred while executing the command',
        ephemeral: true,
      });
    }
  }

  _checkRequiredRoles(interaction) {
    /**
     * @private
     * @param interaction {UnifiedInteraction} the interaction
     * @returns {Boolean} true if the user has the required roles, false otherwise
     */
    if (this.requiredRoles.length > 0) {
      const rolesFound = [];
      this.requiredRoles.forEach(role => {
        if (interaction.author.hasRole(role)) {
          rolesFound.push(role);
        }
      });
      if (this.requireAllRoles) {
        return rolesFound.length === this.requiredRoles.length;
      }
      return rolesFound.length > 0;
    }
    return true;
  }
}

export default Command;
