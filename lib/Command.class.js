const { SlashCommandBuilder } = require('@discordjs/builders');

class Command {
  constructor({ command, description, handler, buttonHandler, isSlashCommand, commandOptions }) {
    this.command = command;
    this.description = description;

    this.handler = handler || this.defaultHandler;
    this.buttonsHandler = buttonHandler || this.defaultButtonsHandler;

    this.options = commandOptions || [];

    this.isSlashCommand = isSlashCommand === undefined ? true : isSlashCommand;

    this._def = new SlashCommandBuilder();
    this._def.setName(this.command)
      .setDescription(this.description);

    this.options.forEach(option => {
      this._def.addStringOption(option);
    });
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