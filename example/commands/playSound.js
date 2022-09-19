import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import { SoundManager } from '../../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultVolumes = {
  campfire: 0.3,
  cave: 0.1,
  epicCombat: 0.08,
  hive: 0.08,
  magicForest: 0.2,
  nobleParty: 0.05,
  ritual: 0.035,
  riverside: 0.08,
  antre: 0.03,
};

const soundFilesDir = join(__dirname, '..', '..', '..', 'marvin', 'commands', 'dnd', 'ambiances');

const soundManagerOptions = {
  channelName: 'DnD',
  buttonPrefix: 'playsound',
  defaultVolumes,
  soundFilesDir,
};

let soundManager;

const getSoundManager = async interaction => {
  if (!soundManager) {
    soundManager = new SoundManager({ ...soundManagerOptions, interaction });
    await soundManager.init();
  }
};

const commandHandler = async interaction => {
  await getSoundManager(interaction);
  return interaction.reply({ content: 'Quel son jouer ?', components: await soundManager.menu() });
};

const buttonsHandler = async interaction => {
  const soundName = interaction.buttonId.replace(/^(playsound-)/, '');

  await getSoundManager(interaction);

  try {
    return soundManager.playOrStop(interaction, soundName);
  } catch (error) {
    interaction.bot.error(error);
    return false;
  }
};

const getButtonsIds = async () => {
  const globPath = join(soundFilesDir, '**/*.webm');
  const files = await globby(globPath);
  const buttons = files.map(f => {
    const name = basename(f).replace(/(\.webm)$/, '');
    return `playsound-${name}`;
  });
  buttons.push('playsound-stop');
  return buttons;
};

const buttonsHandheld = await getButtonsIds();

export default {
  name: 'playSound',
  description: 'Play some sounds in DM Channel',
  isSlashCommand: true,
  requiredRoles: ['GM'],
  requiredRolesErrorMessage: 'https://c.tenor.com/nw2rtAIe1UQAAAAd/power-lord-of-the-rings.gif',
  commandHandler,
  buttonsHandler,
  buttonsHandheld,
};
