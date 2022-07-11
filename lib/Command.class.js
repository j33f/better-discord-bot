const { SlashCommandBuilder } = require('@discordjs/builders');
const { interactionUserHaveRoles } = require('./utils/membersAndRoles');

class Command {
  constructor({ command, description, handler, buttonHandler, isSlashCommand, commandOptions, mustHaveRoles, notHaveRolesMessage }) {
    this.command = command;
    this.description = description;

    this.options = commandOptions || [];

    this.isSlashCommand = isSlashCommand === undefined ? true : isSlashCommand;

    this.mustHaveRoles = mustHaveRoles || [];
    this.notHaveRolesMessage = notHaveRolesMessage || 'You do not have the required roles to use this command.';

    this._def = new SlashCommandBuilder();
    this._def.setName(this.command)
      .setDescription(this.description);

    this.options.forEach(option => {
      this._def.addStringOption(option);
    });

    this.handler = (interaction) => {
      const h = handler || this.defaultHandler;
      if (this.isSlashCommand && this.mustHaveRoles.length > 0) {
        if (!interactionUserHaveRoles(interaction, this.mustHaveRoles)) {
          return interaction.reply({ content: this.notHaveRolesMessage, ephemeral: true });
        }
      }
      return h(interaction);
    };
    this.buttonsHandler = buttonHandler || this.defaultButtonsHandler;
  }

  get def() {
    return this._def.toJSON();
  }

  get me() {
    return {
      command: this.command,
      def: this.def,
      handler: this.handler,
      buttonsHandler: this.buttonsHandler,
      thisObject: this,
      isSlashCommand: this.isSlashCommand,
    };
  }

  async defaultHandler(interaction) {
    const content = 'The command has been received, but there is nothing to do...';
    await interaction.reply({ content, ephemeral: true });
  }

  async defaultButtonsHandler() {
    return 0;
  }
}

module.exports = Command;