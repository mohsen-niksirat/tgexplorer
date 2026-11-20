import { api } from 'sdk';
import {
  ABOUT_EN,
  ABOUT_FA,
  COMMANDS_EN,
  COMMANDS_FA,
  DESC_EN,
  DESC_FA,
} from '../lib/texts.js';

export default async function () {
  await api.setMyCommands({ commands: COMMANDS_EN });
  await api.setMyCommands({ commands: COMMANDS_FA, language_code: 'fa' });

  await api.setMyDescription({ description: DESC_EN });
  await api.setMyDescription({ description: DESC_FA, language_code: 'fa' });

  await api.setMyShortDescription({ short_description: ABOUT_EN });
  await api.setMyShortDescription({ short_description: ABOUT_FA, language_code: 'fa' });

  return { ok: true, languages: ['default (en)', 'fa'] };
}
