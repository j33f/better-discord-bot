const { joinVocalChannel, getVolume } = require('./utils/vocChan');
const { createAudioPlayer, AudioPlayerStatus, VoiceConnectionStatus, StreamType, createAudioResource } = require('@discordjs/voice');
const { join, basename } = require('path');
const { createReadStream } = require('fs');
const glob = require('fast-glob');
const { MessageActionRow, MessageButton } = require('discord.js');

class SoundManager {
  constructor({ channelName, defaultVolumes, interaction, filesDirPath, defaultVolume }) {
    this.channelName = channelName;
    this.defaultVolumes = defaultVolumes;
    this.filesDirPath = filesDirPath;
    this.interaction = interaction;

    this.volume = defaultVolume || 0.15;
    this.soundName = undefined;
    this.soundNames = [];
  }

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

  async getSoundsNames() {
    const globPath = join(this.filesDirPath, '**/*.webm');
    const files = await glob(globPath);
    this.soundNames = files.map(f => basename(f).replace(/(\.webm)$/, ''));
    return this.soundNames;
  }

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