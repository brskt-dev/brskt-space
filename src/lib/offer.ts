/**
 * Formatting of the Dev parceiro offer (numbers in src/content/pages/dev-partner/<lang>.md,
 * `offer`), shared by the landing and the home banner so both always show the same thing.
 */
import { intlLocale, t, type Lang } from '../i18n/ui';

export interface Offer {
  monthlyPrice: number;
  currency: 'BRL';
  months: number;
}

/** "R$ 3.000" / "R$ 3,000" (non-breaking space), "por mês", "contrato de 6 meses". */
export function formatOffer(lang: Lang, offer: Offer) {
  return {
    price: `R$ ${offer.monthlyPrice.toLocaleString(intlLocale[lang])}`,
    perMonth: t(lang, 'service.perMonth'),
    term: t(lang, 'service.term').replace('{n}', String(offer.months)),
  };
}
