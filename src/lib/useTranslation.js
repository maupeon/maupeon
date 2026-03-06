import { useRouter } from 'next/router'
import es from '@/lib/translations/es.json'
import en from '@/lib/translations/en.json'

const translations = { es, en }

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

export function useTranslation() {
  const { locale } = useRouter()
  const dict = translations[locale] || translations.es

  function t(key, fallback) {
    return getNestedValue(dict, key) ?? fallback ?? key
  }

  return { t, locale }
}
