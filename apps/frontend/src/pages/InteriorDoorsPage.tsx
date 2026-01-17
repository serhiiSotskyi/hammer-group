import { useQuery } from "@tanstack/react-query";
import DoorProductCard from "@/components/doors/DoorProductCard";
import { getProducts, ProductResponse } from "@/services/api";
import { useTranslation } from 'react-i18next';
import { formatCurrencyByLang } from '@/lib/format';

function formatCurrency(amountCents: number, currency = "UAH", lang = 'uk') {
  return formatCurrencyByLang(amountCents, currency, lang);
}

export default function InteriorDoorsPage() {
  const { t, i18n } = useTranslation();
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["interior-doors"],
    queryFn: () => getProducts({ categorySlug: "interior" }),
  });

  if (isLoading) return <p className="p-10">{t('customizer.updating')}</p>;
  if (error) return <p className="p-10 text-red-500">{t('common.failed')}</p>;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-6">{t('pages.interiorTitle')}</h1>
      <p className="text-sm sm:text-lg text-gray-700 mb-6 sm:mb-10">{t('pages.interiorBlurb')}</p>

      {/* Mobile: 2 per row; Tablets: 2; Desktop: 5 (≈18% each) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 door-grid">
        {products?.map((door: ProductResponse) => (
          <DoorProductCard
            key={door.id}
            name={door.name}
            imageUrl={door.imageUrl}
            priceLabel={`${t('common.from')} ${formatCurrency(door.convertedPriceCents ?? door.basePriceCents, door.currency ?? 'UAH', i18n.language)}`}
            ctaLabel={t('common.customize')}
            href={`/customizer?slug=${door.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
