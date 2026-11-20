export const APP_URL = 'https://mohsen-niksirat.github.io/tgexplorer/';
export const BOT_USERNAME = 'telgexplorerbot';

export const ABOUT_EN =
  'Explore for Telegram: discover public channels by topic, not by name. 131+ verified channels, in English & Persian.';

export const ABOUT_FA =
  'اکسپلور تلگرام: کشف کانال‌های عمومی بر اساس موضوع، نه فقط نام. بیش از ۱۳۱ کانال تاییدشده به فارسی و انگلیسی.';

export const DESC_EN =
  'TGExplorer helps you discover public Telegram channels and groups by topic, language, and live activity.\n\n' +
  "We surface great small channels alongside the big ones so they don't stay hidden.\n\n" +
  'Tap Open Explore to start: ' + APP_URL;

export const DESC_FA =
  'اکسپلور تلگرام به شما کمک می‌کند کانال‌ها و گروه‌های عمومی تلگرام را بر اساس موضوع، زبان و فعالیت زنده پیدا کنید.\n\n' +
  'ما کانال‌های کوچک و باکیفیت را هم کنار کانال‌های بزرگ نشان می‌دهیم تا دیده شوند.\n\n' +
  'برای شروع دکمه باز کردن اکسپلور را بزنید.';

export const COMMANDS_EN = [
  { command: 'start', description: 'Open TGExplorer' },
  { command: 'app', description: 'Launch the Mini App' },
  { command: 'help', description: 'What this bot does' },
];

export const COMMANDS_FA = [
  { command: 'start', description: 'باز کردن اکسپلور تلگرام' },
  { command: 'app', description: 'اجرای مینی‌اپ' },
  { command: 'help', description: 'معرفی ربات' },
];

export function isFa(lang) {
  return String(lang || '').toLowerCase().startsWith('fa');
}

export function buildExploreKeyboard(lang, channelUsername) {
  const url = channelUsername ? `${APP_URL}?channel=${encodeURIComponent(channelUsername)}` : APP_URL;
  const text = isFa(lang) ? '🔍 باز کردن اکسپلور' : '🔍 Open Explore';
  return {
    inline_keyboard: [[{ text, web_app: { url } }]],
  };
}

export function welcomeText(lang) {
  if (isFa(lang)) {
    return (
      'به اکسپلور تلگرام خوش آمدید.\n\n' +
      'کانال‌ها و گروه‌های عمومی تلگرام را بر اساس موضوع، زبان و فعالیت زنده پیدا کنید.\n' +
      'ما کانال‌های کوچک و باکیفیت را هم کنار کانال‌های بزرگ نشان می‌دهیم تا دیده شوند.'
    );
  }
  return (
    'Welcome to TGExplorer.\n\n' +
    'Discover public Telegram channels and groups by topic, language, and live activity.\n' +
    "We surface great small channels alongside the big ones so they don't stay hidden."
  );
}

export function helpText(lang) {
  return isFa(lang) ? DESC_FA : DESC_EN;
}

export function fallbackText(lang) {
  return isFa(lang)
    ? 'برای گشت‌وگذار در کانال‌ها، دکمه زیر را بزنید.'
    : 'Tap the button below to open TGExplorer.';
}
