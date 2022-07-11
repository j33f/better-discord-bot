const { SlashCommandBuilder } = require('@discordjs/builders');

class Command {
  constructor({ command, description, handler, buttonHandler, isSlashCommand = true }) {
    this.command = command;
    this.description = description;

    this.handler = handler || this.defaultHandler;
    this.buttonsHandler = buttonHandler || this.defaultButtonsHandler;

    if (isSlashCommand) {
      this.def = new SlashCommandBuilder()
        .setName(this.command)
        .setDescription(this.description);
    }
    this.isSlashCommand = isSlashCommand;
  }

  get me() {
    return {
      command: this.command,
      def: this.def,
      handler: this.handler,
      buttonsHandler: this.buttonsHandler,
      thisObject: this,
    };
  }

  async defaultHandler(interaction) {
    const content = 'The command has been recieved, but there is nothing to do...';
    await interaction.reply({ content, ephemeral: true });
  }

  async defaultButtonsHandler() {
    return 0;
  }
}

module.exports = Command;