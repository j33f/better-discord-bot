import { createReadStream } from 'node:fs';
import { basename, join } from 'node:path';
import {
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  createAudioResource,
} from '@discordjs/voice';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { globby } from 'globby';

class SoundManager {
  constructor({ channelName, buttonPrefix, defaultVolumes, interaction, soundFilesDir, defaultVolume }) {
    /**
     * Sounds Manager allowing to play sounds in a voice channel.
     * channelName {string} - The name of the voice channel to manage
     * defaultVolumes {Array<number>} - The default volume for each sound. (default: 0.15 for 15%)
     * interaction {UnifiedInteraction} - The interaction object to use for replies.
     * soundFilesDir {string} The path to the directory containing the sounds.
     * defaultVolume {number} The default sound volume. (default: 0.15 for 15%)
     */
    this.channelName = channelName;
    this.buttonPrefix = buttonPrefix || 'playsound';
    this.defaultVolumes = defaultVolumes;
    this.soundFilesDir = soundFilesDir;
    this.interaction = interaction;
    this.bot = interaction.bot;

    this.volume = defaultVolume || 0.15;
    this.defaultVolume = defaultVolume || 0.15;
    this.soundName = undefined;
    this.soundNames = [];
  }

  async init() {
    /**
     * Initialize the SoundManager.
     * @returns {Promise<void>}
     */
    const { vocChan } = await this.interaction.joinVocalChannel(this.channelName);
    this.connection = vocChan;

    this.player = createAudioPlayer();
    this.player.on(AudioPlayerStatus.Playing, async () => {
      const content = `Playing "${this.soundName}" (volume: ${this.volume}) on chan "${this.channelName}"`;
      const components = await this.menu();

      await this.interaction.reply({ content, components });
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
      this.bot.warn(`soundName "${soundName}" not found`);
      return false;
    }

    this.interaction = interaction;
    this.soundName = soundName;
    this.volume = volume || this.getVolume(soundName);

    const filePath = join(this.soundFilesDir, `${soundName}.webm`);

    const resource = createAudioResource(createReadStream(filePath), {
      inputType: StreamType.WebmOpus,
      inlineVolume: true,
    });

    resource.volume.setVolume(this.volume);

    const content = `Playing "${this.soundName}" in "${this.channelName} (volume: ${this.volume})"`;
    const components = await this.menu();

    this.player.play(resource);

    await this.interaction.reply({ content, components });

    return true;
  }

  async stop() {
    this.player.stop(true);
    const content = 'Stop.';
    const components = await this.menu();

    await this.interaction.reply({ content, components });
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
      await this.interaction.reply({ content, components });
    }
  }

  async getSoundsNames() {
    const globPath = join(this.soundFilesDir, '**/*.webm');
    const files = await globby(globPath);
    this.soundNames = files.map(f => basename(f).replace(/(\.webm)$/, ''));
    return this.soundNames;
  }

  async menu() {
    await this.getSoundsNames();

    const rows = [];
    let rowCount = 0;
    let row = new ActionRowBuilder();

    this.soundNames.forEach(name => {
      if (rowCount === 5) {
        rows.push(row);
        row = new ActionRowBuilder();
        rowCount = 0;
      }

      rowCount++;
      row.addComponents(new ButtonBuilder()
        .setCustomId(`${this.buttonPrefix}-${name}`)
        .setLabel(`${name}`)
        .setStyle(ButtonStyle.Primary),
      );
    });

    if (rowCount > 0) {
      rows.push(row);
      row = new ActionRowBuilder();
    }

    row.addComponents(new ButtonBuilder()
      .setCustomId(`${this.buttonPrefix}-stop`)
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger),
    );
    rows.push(row);

    return rows;
  }

  getVolume(soundName = '') {
    return this.defaultVolumes[soundName] || this.defaultVolume;
  }
}

export default SoundManager;
