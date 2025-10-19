import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../../shared/locales/en/common.json';
import enMenu from '../../shared/locales/en/menu.json';
import zhCommon from '../../shared/locales/zh-CN/common.json';
import zhMenu from '../../shared/locales/zh-CN/menu.json';

const resources = {
  en: { common: enCommon, menu: enMenu },
  'zh-CN': { common: zhCommon, menu: zhMenu },
};

const SUPPORTED_LANGS = ['en', 'zh-CN'] as const;
export type Language = (typeof SUPPORTED_LANGS)[number];

export const i18n = i18next.createInstance();

export async function initI18nRenderer() {
  const initial: Language = await window.parallelchat
    ?.invoke('parallelchat/i18n/get')
    .then((res: any) => (res?.language as Language) || 'en')
    .catch(() => 'en');

  await i18n.use(initReactI18next).init({
    resources,
    lng: initial,
    fallbackLng: 'en',
    ns: ['common', 'menu'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  });

  window.parallelchat?.on('parallelchat/i18n/changed', (lang: any) => {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    i18n.changeLanguage(lang);
  });
}