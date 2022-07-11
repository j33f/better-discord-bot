# unicorn-discord-bot

> A simple but robust and highly customizable Discord bot.

## Installation

```shell
npm install better-discord-bot

yarn install better-discord-bot
```

## Usage

```javascript
const { DiscordBot, Intents } = require('better-discord-bot');
const { join } = require('path');

// get all possible intents
const bits = [];
for (const key in Intents.FLAGS) {
  bits.push(Intents.FLAGS[key]);
}
const intents = new Intents(bits);

// bot options
const options = {
  clientOptions: {
    intents,
  },
  commandsDirPath: join(__dirname, 'commands'), // where your commands lives
  prefix: '+!',
  talkingToMeResponse: 'http://sayitwithcaptions.com/wp-content/uploads/2020/10/You-talkin-to-me-1.jpg',
  talkingAboutMeResponse: 'http://sayitwithcaptions.com/wp-content/uploads/2021/02/Quoi.png',
};

// create the bot
const bot = new DiscordBot(options);

// start the bot
bot.start();
```

### Enviorment Variables

As this package is using `dotenv` to load the `.env` file, you can set the following minimal enviorment variables:

```shell
PUBLIC_KEY=""
APP_ID=""
BOT_TOKEN=""
CLIENT_ID=""
DEV_MODE=on
GUILD_ID=""
````

**Note:** The `DEV_MODE` on is useful to test the commands, since when it is not in dev mode, Discord performs a command cache which can be very long.
As long as you use your bot in a dev environment and onto only one Discord server (aka guild), it is pretty useful to keep the `DEV_MODE` on.

### Commands

You can add commands to the bot by adding them to the `commandsDirPath` option. Or add them before it starts with the `addCommand` method of the DiscordBot class.

Commands can be triggered via:
- slash commands like `/ping`
- prefixed commands like `!ping` (you can set the bot prefix with the `prefix` option of the DiscordBot class)
- mentions like `@bot ping` (the command name can be everywhere in the message ; supports multiple commands)

By default, all commands can be triggered via these three behaviors. You can change this behavior by setting the `isSlashCommand` option of the DiscordBot class to `false`. if `isSlashCommand` is `false`, the bot will only accept commands prefixed with the bot prefix and "mentions" calls only, for this command.

Here is a simple example of a ping command:

```javascript
const { Command } = require('better-discord-bot');

const ping = new Command({
  command: 'ping',
  description: 'Replies with pong!',
  handler: async (interaction) => {
    await interaction.reply({ content: 'pong!', ephemeral: true });
  },
});

module.exports = ping.me;
```

### Buttons handling

Each command can declare a buttons handler. This handler will be called when the user clicks on a button in the command's message.
To do so, you need to add the `buttonsHandler` option to the command.

### SoundManager

This bot is able to join a vocal channel and play sounds into it. To do so, you can import the `SoundManager` class and use it to create a sound manager.
This implementation can natively play webm formatted files.

Here is an example of a play sound command using the sound manager:

```javascript
const { Command, SoundManager } = require('better-discord-bot');
const { join } = require('path');

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
const filesDirPath = join(__dirname, 'dnd', 'ambiances');

const soundManagerOptions = {
  channelName: 'DnD',
  defaultVolumes,
  filesDirPath,
};

let soundManager;

const getSoundManager = async (interaction) => {
  if (!soundManager) {
    soundManager = new SoundManager({ ...soundManagerOptions, interaction });
    await soundManager.init();
  }
};

const handler = async (interaction) => {
  await getSoundManager(interaction);
  await interaction.reply({ content: 'Quel son jouer ?', components: await soundManager.menu() });
};

const buttonHandler = async (interaction) => {
  if (interaction.customId.lastIndexOf('playsound-', 0) !== 0) {
    return 0;
  }

  const soundName = interaction.customId.replace(/^(playsound-)/, '');

  await getSoundManager(interaction);

  try {
    await soundManager.playOrStop(interaction, soundName);
  } catch (error) {
    console.error(error.message);
  }

  return 1;
};

const playsound = new Command({
  command: 'playsound',
  description: 'play a sound in a voice channel',
  handler,
  buttonHandler,
  requiredRoles: ['GM'],
  requiredRolesErrorMessage: 'https://c.tenor.com/nw2rtAIe1UQAAAAd/power-lord-of-the-rings.gif',
});

module.exports = playsound.me;
```
