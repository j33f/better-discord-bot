const { joinVoiceChannel } = require('@discordjs/voice');
/**
 * Join a voice chan
 * @param interaction
 * @param name
 * @returns {Promise<*>}
 */
const joinVocalChannel = async (interaction, name = 'DnD') => {
  const channels = await interaction.guild.channels.fetch();
  const chan = channels.find(c => c.name === name);

  const vocChan = await joinVoiceChannel({
    channelId: chan.id,
    guildId: chan.guild.id,
    adapterCreator: chan.guild.voiceAdapterCreator,
  });

  return { chan, vocChan };
};

const getVolume = (interaction, soundName = '', defaultVolumes = [], defaultVolume = 0.15) => {
  let volume = defaultVolume;
  if (Object.keys(defaultVolumes).includes(soundName)) {
    volume = defaultVolumes[soundName];
  }

  return volume;
};

module.exports = { getVolume, joinVocalChannel };