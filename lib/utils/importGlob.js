import { globby } from 'globby';

export default async function importGlob(path, bot) {
  try {
    const files = await globby(path, {
      expandDirectories: {
        files: ['*'],
        extensions: ['js', 'ts', 'mjs', 'cjs'],
      },
    });
    return Promise.all(files.map(file => import(file)))
      .then(modules => modules.map(module => module.default));
  } catch (e) {
    bot.error(e.message);
    return [];
  }
}
