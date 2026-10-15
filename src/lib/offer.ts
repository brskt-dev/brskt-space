/**
 * Formatting of the Dev parceiro offer (numbers in src/content/pages/dev-partner/<lang>.md,
 * `offer`), used only by the landing's “Quanto custa” section.
 */
import { intlLocale, t, type Lang } from '../i18n/ui';

export interface Offer {
  monthlyPrice: number;
  currency: 'BRL';
}

/** "R$ 3.000" / "R$ 3,000" and "por mês". The contract term is never shown publicly. */
export function formatOffer(lang: Lang, offer: Offer) {
  return {
    price: `R$ ${offer.monthlyPrice.toLocaleString(intlLocale[lang])}`,
    perMonth: t(lang, 'service.perMonth'),
  };
}
