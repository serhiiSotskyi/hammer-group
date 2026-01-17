import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DoorProductCard from '@/components/doors/DoorProductCard';
import { getProducts, ProductResponse } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { formatCurrencyByLang } from '@/lib/format';

export default function InteriorCollectionListPage() {
  const { collection } = useParams<{ collection: string }>();
  const { t, i18n } = useTranslation();
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['interior-collection', collection],
    queryFn: () => getProducts({ categorySlug: 'interior', collection: String(collection) }),
  });

  if (isLoading) return <p className="p-10">{t('customizer.updating')}</p>;
  if (error) return <p className="p-10 text-red-500">{t('common.failed')}</p>;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
          {String(collection)[0]?.toUpperCase() + String(collection).slice(1)} Collection
        </h1>
        <Link to="/interior-doors" className="text-accent underline text-sm sm:text-base">Back</Link>
      </div>
      {/* Mobile: 2 per row; Tablets: 2; Desktop: 5 (≈18% each) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 door-grid">
        {products?.map((door: ProductResponse) => (
          <DoorProductCard
            key={door.id}
            name={door.name}
            imageUrl={door.imageUrl}
            priceLabel={`${t('common.from')} ${formatCurrencyByLang(door.convertedPriceCents ?? door.basePriceCents, door.currency ?? 'UAH', i18n.language)}`}
            ctaLabel={t('common.customize')}
            href={`/customizer?slug=${door.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
