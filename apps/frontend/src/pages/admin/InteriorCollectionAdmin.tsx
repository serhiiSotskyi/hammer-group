import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCategories, getCollections } from '@/services/api';
import DoorTable from '@/components/admin/DoorTable';

export default function InteriorCollectionAdmin() {
  const { collection } = useParams<{ collection: string }>();
  const cats = useQuery({ queryKey: ['categories'], queryFn: getCategories });
  const interior = cats.data?.find((c) => c.slug === 'interior');
  const cols = useQuery({ queryKey: ['collections', 'interior'], queryFn: () => getCollections('interior'), enabled: Boolean(interior) });
  const current = cols.data?.find((c) => c.slug === collection);

  if (cats.isLoading || cols.isLoading) return <p className="p-6">Завантаження…</p>;
  if (!interior || !current) return <p className="p-6 text-red-500">Колекцію не знайдено</p>;

  return (
    <div>
      <br /><br /><br /><br />
      <h1 className="text-3xl font-bold mb-6">{current.name} · Міжкімнатні двері</h1>
      <DoorTable categorySlug={interior.slug} collectionSlug={current.slug} defaultCollectionId={current.id} />
    </div>
  );
}
