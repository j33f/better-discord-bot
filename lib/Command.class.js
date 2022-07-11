const { SlashCommandBuilder } = require('@discordjs/builders');
const { interactionUserHaveRoles } = require('./utils/membersAndRoles');

class Command {
  constructor({ command, description, handler, buttonHandler, isSlashCommand, commandOptions, requiredRoles, requiredRolesErrorMessage }) {
    this.command = command;
    this.description = description;

    this.options = commandOptions || [];

    this.isSlashCommand = isSlashCommand === undefined ? true : isSlashCommand;

    this.requiredRoles = requiredRoles || [];
    this.requiredRolesErrorMessage = requiredRolesErrorMessage || 'You do not have the required roles to use this command.';

    this._def = new SlashCommandBuilder();
    this._def.setName(this.command)
      .setDescription(this.description);

    this.options.forEach(option => {
      this._def.addStringOption(option);
    });

    this.handler = async (interaction) => {
      const h = handler || this.defaultHandler;

      if (this.isSlashCommand && this.requiredRoles.length > 0) {
        const haveRoles = await interactionUserHaveRoles(interaction, this.requiredRoles);

        if (!haveRoles) {
          await interaction.reply({ content: this.requiredRolesErrorMessage, ephemeral: true });
          return;
        }
      }

      await h(interaction);
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