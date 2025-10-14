import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const isUk = i18n.language?.startsWith('uk');
  const label = isUk ? 'EN' : 'UA';
  return (
    <button
      onClick={() => i18n.changeLanguage(isUk ? 'en' : 'uk')}
      className="px-3 py-1 text-sm border rounded hover:bg-accent/10"
      aria-label="Toggle language"
    >
      {label}
    </button>
  );
}

