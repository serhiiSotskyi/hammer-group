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
  const serviceHighlights = [
    {
      title: "Під розмір",
      text: "Виготовляємо дверні полотна для стандартних і нестандартних прорізів після уточнення розмірів.",
    },
    {
      title: "Матеріали та фурнітура",
      text: "Допомагаємо підібрати конструкцію, покриття, скло, лиштви, петлі та замки під інтер’єр.",
    },
    {
      title: "Замір і прорахунок",
      text: "Виконуємо замір, готуємо попередній прорахунок і погоджуємо деталі перед виробництвом.",
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="max-w-4xl mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-bold mb-4">{t('pages.interiorTitle')} на замовлення в Одесі</h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Hammer Group виготовляє міжкімнатні двері на замовлення для квартир, будинків і комерційних просторів. Якщо потрібно купити двері під конкретний проріз, підібрати дизайн, матеріали й фурнітуру або отримати прорахунок за розмірами, ми допоможемо з рішенням від консультації до виробництва.
        </p>
      </div>
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
      <section className="mt-10 sm:mt-14 max-w-6xl mx-auto" aria-labelledby="interior-service-title">
        <h2 id="interior-service-title" className="text-2xl sm:text-3xl font-bold mb-5">Міжкімнатні двері під ваш проєкт</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {serviceHighlights.map((item) => (
            <div key={item.title} className="border rounded-lg p-5 bg-background">
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-sm sm:text-base text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
