const { Intents } = require('discord.js');
const Command = require('./lib/Command.class');
const DiscordBot = require('./lib/DiscordBot.class');
const SoundManager = require('./lib/SoundManager.class');
const membersUtils = require('./lib/utils/membersAndRoles');
const vocChanUtils = require('./lib/utils/vocChan');


module.exports = {
  DiscordBot,
  Command,
  SoundManager,
  vocChanUtils,
  membersUtils,
  Intents,
};
