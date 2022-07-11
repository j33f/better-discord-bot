const { joinVoiceChannel } = require('@discordjs/voice');

/**
 * Join a voice chan
 * @param interaction
 * @param name
 * @returns {Promise<{chan: <Channel>, vocchan: <VoiceChannelManager>}>}
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

/**
 * Determine which volume to use for the voice channel
 * @param interaction {Interaction} - The interaction object to use for replies.
 * @param soundName {string} - The name of the sound.
 * @param defaultVolumes {Array<{name: <String>, volume: <number>}>} - The default volume for each sound. (default: 0.15 for 15%)
 * @param defaultVolume {number} - The default sound volume. (default: 0.15 for 15%)
 * @returns {number}
 */
const getVolume = (interaction, soundName = '', defaultVolumes = [], defaultVolume = 0.15) => {
  let volume = defaultVolume;
  if (Object.keys(defaultVolumes).includes(soundName)) {
    volume = defaultVolumes[soundName];
  }

  return volume;
};

module.exports = { getVolume, joinVocalChannel };