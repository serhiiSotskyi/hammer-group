import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProducts, ProductResponse, resolveImageUrl } from '@/services/api';
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
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        {products?.map((door: ProductResponse) => (
          <Card key={door.id} className="w-full h-auto overflow-hidden rounded-xl transition hover:shadow-[var(--shadow-hover)] flex flex-col">
            <img
              src={resolveImageUrl(door.imageUrl) || '/placeholder.svg'}
              alt={door.name}
              className="w-full h-auto object-cover object-center"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }}
            />
            <CardHeader className="px-2 pt-2 pb-1 min-h-[40px]">
              <CardTitle className="text-xs sm:text-sm truncate">{door.name}</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pt-0 pb-2 flex flex-col gap-1">
              <p className="text-[11px] sm:text-xs font-semibold truncate">
                {t('common.from')} {formatCurrencyByLang(door.convertedPriceCents ?? door.basePriceCents, door.currency ?? 'UAH', i18n.language)}
              </p>
              <Link to={`/customizer?slug=${door.slug}`} className="mt-auto">
                <Button className="w-full premium-button py-2 text-[11px]">{t('common.customize')}</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
