import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DoorForm from "./DoorForm";
import { deleteProduct, getProducts, ProductResponse, resolveImageUrl } from "@/services/api";

function formatCurrency(amountCents: number, currency = "UAH") {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

type Props = { categoryId?: number; categorySlug?: string; collectionSlug?: string; defaultCollectionId?: number | null };

export default function DoorTable({ categoryId, categorySlug, collectionSlug, defaultCollectionId }: Props) {
  const queryClient = useQueryClient();

  const { data: doors, isLoading } = useQuery({
    queryKey: ["doors", categoryId ?? categorySlug ?? "all", collectionSlug ?? ""],
    queryFn: () => {
      if (categorySlug) return getProducts({ categorySlug, includeInactive: "true", ...(collectionSlug ? { collection: collectionSlug } : {}) });
      if (categoryId) return getProducts({ categoryId, includeInactive: "true" });
      return getProducts({ includeInactive: "true" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doors"] }),
  });

  if (isLoading) return <p>Завантаження…</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Двері</h2>
        <DoorForm categoryId={categoryId as any} categorySlug={categorySlug} defaultCollectionId={defaultCollectionId ?? undefined} />
      </div>

      <div className="grid gap-4">
        {doors?.map((door: ProductResponse) => (
          <Card key={door.id} className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img
                src={resolveImageUrl(door.imageUrl) || "/placeholder.svg"}
                alt={door.name}
                className="h-12 w-12 object-cover rounded border"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
              <div>
                <p className="font-bold">{door.name}</p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(door.convertedPriceCents ?? door.basePriceCents, door.currency ?? 'UAH')} · <span className="uppercase text-xs">{door.slug}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <DoorForm categoryId={door.categoryId} categorySlug={categorySlug} door={door} defaultCollectionId={defaultCollectionId ?? undefined} />
              <Button
                type="button"
                variant="destructive"
                onClick={() => deleteMutation.mutate(door.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Видалення..." : "Видалити"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
