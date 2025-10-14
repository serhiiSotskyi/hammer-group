import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getProducts, ProductResponse, resolveImageUrl } from "@/services/api";
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
    <div className="p-10">
      <h1 className="text-4xl font-bold mb-6">{t('pages.interiorTitle')}</h1>
      <p className="text-lg text-gray-700 mb-10">{t('pages.interiorBlurb')}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8">
        {products?.map((door: ProductResponse) => (
          <Card key={door.id} className="overflow-hidden transition hover:shadow-lg">
            <img
              src={resolveImageUrl(door.imageUrl) || "/placeholder.svg"}
              alt={door.name}
              className="w-full h-68 object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/placeholder.svg";
              }}
            />
            <CardHeader>
              <CardTitle>{door.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold mb-4">
                {t('common.from')} {formatCurrency(door.convertedPriceCents ?? door.basePriceCents, door.currency ?? 'UAH', i18n.language)}
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
