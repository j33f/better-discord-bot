export default {
  name: 'mention',
  description: 'replies to mentions!',
  isSlashCommand: false,
  isMessageCommand: false,
  mentionHandler: interaction => {
    if (interaction.isMentioningMe && !interaction.isToMe) {
      interaction.reply({ content: 'On parle de moi ?' });
    } else {
      interaction.reply({ content: 'Hello' });
    }
  },
  dmHandler: interaction => {
    interaction.reply({ content: 'Hello, je réponds à ton DM' });
  },
};
