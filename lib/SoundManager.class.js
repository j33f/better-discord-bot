'use strict';
const { joinVocalChannel, getVolume } = require('./utils/vocChan');
const { createAudioPlayer, AudioPlayerStatus, VoiceConnectionStatus, StreamType, createAudioResource } = require('@discordjs/voice');
const { join, basename } = require('path');
const { createReadStream } = require('fs');
const glob = require('fast-glob');
const { MessageActionRow, MessageButton } = require('discord.js');

class SoundManager {
  /**
   * The sound manager constructor.
   *
   * Allow you to play sounds in a voice channel.
   *
   * @param channelName {string} - The name of the voice channel.
   * @param defaultVolumes {Array<number>} - The default volume for each sound. (default: 0.15 for 15%)
   * @param interaction {Interaction} - The interaction object to use for replies.
   * @param filesDirPath {string} The path to the directory containing the sounds.
   * @param defaultVolume {number} The default sound volume. (default: 0.15 for 15%)
   */
  constructor({ channelName, defaultVolumes, interaction, filesDirPath, defaultVolume }) {
    this.channelName = channelName;
    this.defaultVolumes = defaultVolumes;
    this.filesDirPath = filesDirPath;
    this.interaction = interaction;

    this.volume = defaultVolume || 0.15;
    this.soundName = undefined;
    this.soundNames = [];
  }

  /**
   * Initiate the SoundManager.
   * @returns {Promise<void>}
   */
  async init() {
    const { vocChan } = await joinVocalChannel(this.interaction, this.channelName);

    this.connection = vocChan;

    this.player = createAudioPlayer();
    this.player.on(AudioPlayerStatus.Playing, async () => {
      await this.interaction.editReply(`Playing "${this.soundName}" (volume: ${this.volume}) on chan "${this.channelName}"`);
    });

    this.player.on('error', error => {
      throw error;
    });

    this.connection.on(VoiceConnectionStatus.Ready, async () => {
      this.subscribtion = this.subscribtion || this.connection.subscribe(this.player);
    });
  }

  /**
   * Play a sound.
   * @param interaction {Interaction} - The interaction object to use for replies.
   * @param soundName {string} - The name of the sound.
   * @param volume {number} - The volume of the sound. (default: 0.15 for 15%)
   * @returns {Promise<boolean>}
   */
  async play(interaction, soundName, volume = undefined) {
    if (this.soundNames.length === 0) {
      this.soundNames = await this.getSoundsNames();
    }
    if (!this.soundNames.includes(soundName)) {
      console.error(`soundName "${soundName}" not found`);
      return false;
    }

    this.interaction = interaction;
    this.soundName = soundName;
    this.volume = volume || getVolume(this.interaction, soundName, this.defaultVolumes);

    const filePath = join(this.filesDirPath, soundName + '.webm');
    const options = {
      inputType: StreamType.WebmOpus,
      inlineVolume: true,
    };

    const resource = createAudioResource(createReadStream(filePath), options);
    resource.volume.setVolume(this.volume);

    const content = `Playing "${this.soundName}" in "${this.channelName} (volume: ${this.volume})"`;
    const components = await this.menu();
    try {
      await this.interaction.reply({ content, components });
    } catch (e) {
      await this.interaction.editReply({ content, components });
    }

    this.player.play(resource);
    return true;
  }

  /**
   * Stop the sound.
   * @returns {Promise<void>}
   */
  async stop() {
    this.player.stop(true);
    const content = 'Stop.';
    const components = await this.menu();
    try {
      await this.interaction.reply({ content, components });
    } catch (e) {
      await this.interaction.editReply({ content, components });
    }
  }

  /**
   * Play or stop the sound depending on the recieved message.
   * @param interaction {Interaction} - The interaction object to use for replies.
   * @param soundName {string} - The name of the sound.
   * @param volume {number} - The volume of the sound. (default: 0.15 for 15%)
   * @returns {Promise<void>}
   */
  async playOrStop(interaction, soundName, volume = undefined) {
    if (soundName === 'stop') {
      await this.stop();
      return;
    }

    const response = await this.play(interaction, soundName, volume);
    if (!response) {
      const content = `Sound "${soundName}" not found`;
      const components = await this.menu();
      try {
        await this.interaction.reply({ content, components });
      } catch (e) {
        await this.interaction.editReply({ content, components });
      }
      console.error(content);
    }
  }

  /**
   * Get the list of sounds names by globbing the filesDirPath.
   * @returns {Promise<[]>}
   */
  async getSoundsNames() {
    const globPath = join(this.filesDirPath, '**/*.webm');
    const files = await glob(globPath);
    this.soundNames = files.map(f => basename(f).replace(/(\.webm)$/, ''));
    return this.soundNames;
  }

  /**
   * Create the menu for the sound to display on Discord
   * @returns {Promise<*[]>}
   */
  async menu() {
    await this.getSoundsNames();

    const rows = [];
    let rowCount = 0;
    let row = new MessageActionRow();

    this.soundNames.forEach(name => {
      if (rowCount === 5) {
        rows.push(row);
        row = new MessageActionRow();
        rowCount = 0;
      }

      rowCount++;
      row.addComponents(
        new MessageButton()
          .setCustomId(`playsound-${name}`)
          .setLabel(`${name}`)
          .setStyle('PRIMARY'),
      );
    });

    if (rowCount > 0) {
      rows.push(row);
      row = new MessageActionRow();
    }

    row.addComponents(
      new MessageButton()
        .setCustomId('playsound-stop')
        .setLabel('STOP')
        .setStyle('DANGER'),
    );
    rows.push(row);

    return rows;
  }
}

module.exports = SoundManager;