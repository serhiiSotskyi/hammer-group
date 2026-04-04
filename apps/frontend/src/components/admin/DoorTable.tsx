import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import DoorForm from "./DoorForm";
import { deleteProduct, getProducts, ProductResponse, reorderInteriorDoors, resolveImageUrl } from "@/services/api";
import { Input } from "@/components/ui/input";

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
  const [draftDoors, setDraftDoors] = useState<ProductResponse[]>([]);
  const isInteriorCollection = categorySlug === "interior" && Boolean(collectionSlug);

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

  const reorderMutation = useMutation({
    mutationFn: (items: Array<{ id: number; sortOrder: number }>) => reorderInteriorDoors(items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doors"] }),
  });

  useEffect(() => {
    setDraftDoors([...(doors ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
  }, [doors]);

  const updateDraftOrder = (next: ProductResponse[]) => {
    setDraftDoors(next.map((door, index) => ({ ...door, sortOrder: index + 1 })));
  };

  const moveDoor = (id: number, direction: -1 | 1) => {
    setDraftDoors((current) => {
      const next = [...current];
      const index = next.findIndex((door) => door.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((door, orderIndex) => ({ ...door, sortOrder: orderIndex + 1 }));
    });
  };

  const changeSortOrder = (id: number, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setDraftDoors((current) => {
      const next = [...current];
      const index = next.findIndex((door) => door.id === id);
      if (index === -1) return current;
      const [door] = next.splice(index, 1);
      const bounded = Math.min(Math.max(Math.round(parsed), 1), next.length + 1);
      next.splice(bounded - 1, 0, door);
      return next.map((item, orderIndex) => ({ ...item, sortOrder: orderIndex + 1 }));
    });
  };

  const hasOrderChanges =
    isInteriorCollection &&
    draftDoors.length === (doors?.length ?? 0) &&
    draftDoors.some((door, index) => door.id !== doors?.[index]?.id || door.sortOrder !== (doors?.[index]?.sortOrder ?? index + 1));

  if (isLoading) return <p>Завантаження…</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Двері</h2>
        <div className="flex items-center gap-3">
          {isInteriorCollection && (
            <Button
              type="button"
              variant="outline"
              disabled={!hasOrderChanges || reorderMutation.isPending}
              onClick={() =>
                reorderMutation.mutate(draftDoors.map((door) => ({ id: door.id, sortOrder: door.sortOrder })))
              }
            >
              {reorderMutation.isPending ? "Збереження порядку..." : "Зберегти порядок"}
            </Button>
          )}
          <DoorForm categoryId={categoryId as any} categorySlug={categorySlug} defaultCollectionId={defaultCollectionId ?? undefined} />
        </div>
      </div>

      <div className="grid gap-4">
        {draftDoors.map((door: ProductResponse, index) => (
          <Card key={door.id} className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {isInteriorCollection && (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => moveDoor(door.id, -1)} disabled={index === 0}>
                      ↑
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => moveDoor(door.id, 1)} disabled={index === draftDoors.length - 1}>
                      ↓
                    </Button>
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min={1}
                      value={door.sortOrder}
                      onChange={(event) => changeSortOrder(door.id, event.target.value)}
                    />
                  </div>
                </div>
              )}
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
