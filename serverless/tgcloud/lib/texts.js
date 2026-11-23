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

export function suggestButtonText(lang) {
  return isFa(lang) ? 'پیشنهاد کانال' : 'Suggest a channel';
}

export function buildExploreKeyboard(lang, channelUsername) {
  const url = channelUsername ? `${APP_URL}?channel=${encodeURIComponent(channelUsername)}` : APP_URL;
  const text = isFa(lang) ? 'باز کردن اکسپلور' : 'Open Explore';
  const rows = [[{ text, web_app: { url } }]];
  if (!channelUsername) {
    rows.push([{ text: suggestButtonText(lang), callback_data: 'suggest_start' }]);
  }
  return {
    inline_keyboard: rows,
  };
}

export function subButtonText(lang, isSubscribed) {
  if (isFa(lang)) {
    return isSubscribed ? 'اطلاع‌رسانی: روشن' : 'اطلاع‌رسانی پست‌های جدید';
  }
  return isSubscribed ? 'Notifications: ON' : 'Notify me about new posts';
}

export function buildChannelCardKeyboard(lang, username, isSubscribed = false) {
  const appUrl = `${APP_URL}?channel=${encodeURIComponent(username)}`;
  const tgUrl = `https://t.me/${encodeURIComponent(username)}`;
  const openAppText = isFa(lang) ? 'باز کردن در TGExplorer' : 'Open in TGExplorer';
  const openTgText = isFa(lang) ? 'باز کردن در تلگرام' : 'Open in Telegram';
  return {
    inline_keyboard: [
      [{ text: openAppText, web_app: { url: appUrl } }],
      [{ text: openTgText, url: tgUrl }],
      [{ text: subButtonText(lang, isSubscribed), callback_data: `sub_toggle:${username}` }],
    ],
  };
}

export function formatChannelCardCaption(lang, card) {
  const lines = [];
  lines.push(card.title || `@${card.username}`);
  lines.push(card.subs ? `@${card.username} · ${card.subs}` : `@${card.username}`);
  if (card.description) {
    const clean = card.description.replace(/\s+/g, ' ').trim();
    const trunc = clean.length > 200 ? clean.slice(0, 197) + '…' : clean;
    lines.push('');
    lines.push(trunc);
  }
  if (card.verified) {
    lines.push('');
    lines.push(isFa(lang) ? '✅ تأییدشده در TGExplorer' : '✅ Verified in TGExplorer');
  }
  return lines.join('\n');
}

export function channelNotFoundText(lang) {
  return isFa(lang)
    ? 'کانال یافت نشد یا عمومی نیست.'
    : 'Channel not found or not public.';
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

export function suggestPromptText(lang) {
  return isFa(lang)
    ? 'یوزرنیم یا لینک کانال عمومی را بفرستید (مثلاً @bbcpersian یا https://t.me/bbcpersian).\nبرای لغو، /cancel را بفرستید.'
    : 'Send the public channel username or link (e.g. @bbcpersian or https://t.me/bbcpersian).\nSend /cancel to exit.';
}

export function suggestCancelledText(lang) {
  return isFa(lang) ? 'پیشنهاد کانال لغو شد.' : 'Channel suggestion cancelled.';
}

export function suggestInvalidText(lang) {
  return isFa(lang)
    ? 'فرمت نام کاربری معتبر نیست. باید ۵ تا ۳۲ کاراکتر از حروف انگلیسی، عدد یا _ باشد (مثلاً @bbcpersian یا https://t.me/bbcpersian).'
    : 'Invalid channel username format. Use 5–32 characters (letters, digits, or _), e.g. @bbcpersian or https://t.me/bbcpersian.';
}

export function suggestAlreadyListedText(lang, username) {
  return isFa(lang)
    ? `کانال @${username} قبلاً در TGExplorer ثبت شده است.`
    : `@${username} is already listed in TGExplorer.`;
}

export function suggestAlreadySubmittedText(lang, username) {
  return isFa(lang)
    ? `کانال @${username} قبلاً پیشنهاد شده و در صف بررسی است.`
    : `@${username} has already been submitted and is under review.`;
}

export function suggestRateLimitText(lang) {
  return isFa(lang)
    ? 'شما در حال حاضر ۳ پیشنهاد در انتظار بررسی دارید. لطفاً پس از بررسی آن‌ها دوباره تلاش کنید.'
    : 'You already have 3 pending suggestions. Please wait for review before submitting another.';
}

export function suggestNotChannelText(lang) {
  return isFa(lang)
    ? 'این نام کاربری یک کانال عمومی تلگرام نیست (گروه، کاربر یا ربات پذیرفته نمی‌شود).'
    : 'This username is not a public Telegram channel (groups, users, and bots are not accepted).';
}

export function suggestNotFoundText(lang) {
  return isFa(lang)
    ? 'کانال عمومی با این نام کاربری پیدا نشد.'
    : 'Could not find a public channel with that username.';
}

export function suggestSubmittedText(lang, title, username) {
  return isFa(lang)
    ? `ممنون! کانال «${title}» (@${username}) ثبت شد و در صف بررسی است.`
    : `Thank you! "${title}" (@${username}) has been submitted and is under review.`;
}

export function suggestDecisionUserText(lang, approved, title, username) {
  if (isFa(lang)) {
    return approved
      ? `پیشنهاد شما برای کانال «${title}» (@${username}) تأیید و به فهرست ربات اضافه شد.`
      : `پیشنهاد شما برای کانال «${title}» (@${username}) تأیید نشد.`;
  }
  return approved
    ? `Your suggestion "${title}" (@${username}) was approved and added to TGExplorer bot search.`
    : `Your suggestion "${title}" (@${username}) was not approved.`;
}

export function subToggledToast(lang, subscribed) {
  if (isFa(lang)) {
    return subscribed ? 'اطلاع‌رسانی فعال شد.' : 'اطلاع‌رسانی غیرفعال شد.';
  }
  return subscribed ? 'Notifications enabled for this channel.' : 'Notifications turned off.';
}

export function notifyListHeader(lang, count) {
  return isFa(lang)
    ? `اشتراک‌های اطلاع‌رسانی شما (${count}):`
    : `Your notification subscriptions (${count}):`;
}

export function notifyEmptyText(lang) {
  return isFa(lang)
    ? 'هنوز هیچ کانالی را برای اطلاع‌رسانی دنبال نکرده‌اید.\nکارت یک کانال را باز کنید و دکمه «اطلاع‌رسانی پست‌های جدید» را بزنید، یا بفرستید:\n/notify @username'
    : 'You have no active notification subscriptions.\nOpen any channel card and tap "Notify me about new posts", or send:\n/notify @username';
}

export function notifyUnsubButton(lang, username, keywords = null) {
  const kwLabel = keywords ? ` [${keywords}]` : '';
  return isFa(lang) ? `لغو اشتراک @${username}${kwLabel}` : `Unsubscribe @${username}${kwLabel}`;
}

export function notifySubscribedText(lang, username, keywords = null) {
  if (keywords) {
    return isFa(lang)
      ? `هشدار هوشمند کلمه کلیدی (${keywords}) برای @${username} فعال شد.`
      : `Smart keyword alert (${keywords}) enabled for @${username}.`;
  }
  return isFa(lang)
    ? `اطلاع‌رسانی پست‌های جدید برای @${username} فعال شد.`
    : `Subscribed to new-post notifications for @${username}.`;
}

export function notifyUnsubDoneText(lang, username) {
  return isFa(lang)
    ? `اشتراک اطلاع‌رسانی @${username} لغو شد.`
    : `Unsubscribed from @${username}.`;
}

export function notifyInvalidChannelText(lang) {
  return isFa(lang)
    ? 'نام کاربری کانال معتبر نیست. مثال: /notify @bbcpersian'
    : 'Invalid channel username. Example: /notify @bbcpersian';
}

function escHtmlText(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function promoKitIntroText(lang) {
  return isFa(lang)
    ? 'می‌خواهید اطلاع‌رسانی کنید؟ این متن آماده را کپی و در کانال منتشر کنید:'
    : "Want to announce it? Here's a ready-made post for the channel — just copy and publish:";
}

export function promoKitPostText(lang, title, username) {
  const link = `https://t.me/${BOT_USERNAME}?start=channel_${username}`;
  if (isFa(lang)) {
    return (
      `کانال «${title}» حالا در TGExplorer ثبت شده است!\n` +
      `این کانال و صدها کانال خوب دیگر را اینجا ببینید: ${link}\n` +
      `کانالی می‌شناسید؟ در @${BOT_USERNAME} پیشنهاد دهید`
    );
  }
  return (
    `${title} is now on TGExplorer!\n` +
    `Discover it — and hundreds of other great channels — here: ${link}\n` +
    `Got a channel? Suggest it in @${BOT_USERNAME}`
  );
}

export function promoKitMessageHtml(lang, title, username) {
  const intro = escHtmlText(promoKitIntroText(lang));
  const body = escHtmlText(promoKitPostText(lang, title, username));
  return `${intro}\n\n<pre>${body}</pre>`;
}
