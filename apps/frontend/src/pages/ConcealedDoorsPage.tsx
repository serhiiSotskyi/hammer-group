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

export default function ConcealedDoorsPage() {
  const { t, i18n } = useTranslation();
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["concealed-doors"],
    queryFn: () => getProducts({ categorySlug: "concealed" }),
  });
  const concealedBenefits = [
    "полотно врівень зі стіною для мінімалістичних інтер’єрів",
    "приховані петлі, магнітні замки та сучасна фурнітура",
    "індивідуальні розміри, замір і прорахунок перед виробництвом",
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="max-w-4xl mb-8 sm:mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">{t('pages.concealedTitle')} на замовлення в Одесі</h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Приховані двері Hammer Group підходять для сучасних квартир, будинків, офісів і комерційних просторів. Ми виготовляємо двері прихованого монтажу під розмір, допомагаємо підібрати оздоблення під стіну або акцентний дизайн, а також готуємо прорахунок за вашим проєктом.
        </p>
        <ul className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {concealedBenefits.map((benefit) => (
            <li key={benefit} className="border rounded-lg p-4 text-sm text-muted-foreground bg-background">
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 min-[1600px]:grid-cols-3 gap-8 items-stretch">
        {isLoading && <p>{t('customizer.updating')}</p>}
        {error && <p className="text-red-500">{t('common.failed')}</p>}
        {!isLoading && !error && products?.map((door: ProductResponse) => (
          <Card key={door.id} className="overflow-hidden transition hover:shadow-lg flex flex-col h-full">
            <div className="door-card-media aspect-[16/9]">
              <img
                src={resolveImageUrl(door.imageUrl) || "/placeholder.svg"}
                alt={door.name}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
            </div>
            <CardHeader>
              <CardTitle>{door.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 flex-1">
              <div className="mt-auto flex flex-col gap-3">
                <p className="text-lg font-semibold">{t('common.from')} {formatCurrency(door.convertedPriceCents ?? door.basePriceCents, door.currency ?? 'UAH', i18n.language)}</p>
                <Link to={`/concealed-customizer?slug=${door.slug}`}>
                  <Button className="w-full premium-button">{t('common.customize')}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
