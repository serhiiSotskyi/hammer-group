import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCollections, Collection, resolveImageUrl } from '@/services/api';

export default function InteriorCollectionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['collections', 'interior-public'],
    queryFn: () => getCollections('interior'),
  });

  const collections: Collection[] = data ?? [];

  return (
    <div className="p-10">
      <h1 className="text-4xl font-bold mb-8">Interior Door Collections</h1>
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-red-500">Failed to load collections</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {collections.map((c) => (
          <Link key={c.slug} to={`/interior-doors/${c.slug}`}>
            <Card className="overflow-hidden hover:shadow-lg transition">
              <img
                src={resolveImageUrl(c.imageUrl) || '/placeholder.svg'}
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }}
                alt={c.name}
                className="w-full h-72 object-cover"
              />
              <CardHeader>
                <CardTitle className="text-2xl">{c.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Explore the {c.name.toLowerCase()} collection</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
