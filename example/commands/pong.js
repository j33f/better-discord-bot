export default {
  name: 'pong',
  description: 'Replies with ping!',
  acceptDM: true,
  isSlashCommand: false,
  commandHandler: interaction => {
    interaction.reply({ content: 'ping!' });
  },
};
