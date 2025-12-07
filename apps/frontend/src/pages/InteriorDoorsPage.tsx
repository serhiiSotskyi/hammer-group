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
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-6">{t('pages.interiorTitle')}</h1>
      <p className="text-sm sm:text-lg text-gray-700 mb-6 sm:mb-10">{t('pages.interiorBlurb')}</p>

      <div className="flex flex-wrap gap-3 sm:gap-4 lg:gap-6">
        {products?.map((door: ProductResponse) => (
          <Card
            key={door.id}
            className="w-[48vw] min-w-[48vw] max-w-[48vw] sm:w-[48vw] sm:min-w-[48vw] sm:max-w-[48vw] md:w-[18vw] md:min-w-[18vw] md:max-w-[18vw] h-auto overflow-hidden rounded-xl transition hover:shadow-[var(--shadow-hover)] flex flex-col"
          >
            <img
              src={resolveImageUrl(door.imageUrl) || "/placeholder.svg"}
              alt={door.name}
              className="w-full h-auto object-cover object-center"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/placeholder.svg";
              }}
            />
            <CardHeader className="px-2 pt-2 pb-1 min-h-[40px]">
              <CardTitle className="text-xs sm:text-sm truncate">{door.name}</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pt-0 pb-2 flex flex-col gap-1">
              <p className="text-[11px] sm:text-xs font-semibold truncate">
                {t('common.from')} {formatCurrency(door.convertedPriceCents ?? door.basePriceCents, door.currency ?? 'UAH', i18n.language)}
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
