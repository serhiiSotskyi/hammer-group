import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCollections, Collection, resolveImageUrl } from '@/services/api';
import { useTranslation } from 'react-i18next';

export default function InteriorCollectionsPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['collections', 'interior-public'],
    queryFn: () => getCollections('interior'),
  });

  const collections: Collection[] = data ?? [];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-4xl font-bold mb-6 sm:mb-8">{t('pages.interiorTitle')}</h1>
      {isLoading && <p>Завантаження…</p>}
      {error && <p className="text-red-500">Не вдалося завантажити колекції</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto">
        {collections.map((c) => (
          <Link key={c.slug} to={`/interior-doors/${c.slug}`} className="block">
            <Card className="overflow-hidden hover:shadow-lg transition">
              <div className="aspect-[16/7] lg:aspect-[16/8] overflow-hidden">
                <img
                  src={resolveImageUrl(c.imageUrl) || '/placeholder.svg'}
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }}
                  alt={c.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <CardHeader className="p-5 sm:p-6">
                <CardTitle className="text-2xl">{c.name}</CardTitle>
              </CardHeader>
              <CardContent className="px-5 sm:px-6 pb-5 sm:pb-6">
                <p className="text-muted-foreground">Переглянути колекцію {c.name.toLowerCase()}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
