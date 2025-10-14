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
    <div className="p-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold">{String(collection)[0]?.toUpperCase() + String(collection).slice(1)} Collection</h1>
        <Link to="/interior-doors" className="text-accent underline">Back</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
        {products?.map((door: ProductResponse) => (
          <Card key={door.id} className="overflow-hidden transition hover:shadow-lg">
            <img
              src={resolveImageUrl(door.imageUrl) || '/placeholder.svg'}
              alt={door.name}
              className="w-full h-68 object-cover"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }}
            />
            <CardHeader>
              <CardTitle>{door.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold mb-4">
                {t('common.from')} {formatCurrencyByLang(door.convertedPriceCents ?? door.basePriceCents, door.currency ?? 'UAH', i18n.language)}
              </p>
              <Link to={`/customizer?slug=${door.slug}`}>
                <Button className="w-full premium-button">{t('common.customize')}</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

