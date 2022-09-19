export default {
  name: 'ping',
  description: 'Replies with pong!',
  acceptDM: true,
  commandHandler: interaction => {
    interaction.reply({ content: 'pong!', ephemeral: true });
  },
};
