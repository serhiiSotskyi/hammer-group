import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ProductResponse, resolveImageUrl, uploadImage, getCollections, Collection, API_ORIGIN } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface DoorFormProps {
  categoryId?: number;
  categorySlug?: string;
  door?: ProductResponse;
  defaultCollectionId?: number;
}

interface DoorFormState {
  name: string;
  slug: string;
  basePriceCents: number;
  imageUrl: string;
  description?: string;
  collectionId?: number | null;
  doorType?: 'STANDARD' | 'BUDGET';
  isActive: boolean;
}

const EMPTY_FORM: DoorFormState = {
  name: "",
  slug: "",
  basePriceCents: 0,
  imageUrl: "",
  description: "",
  collectionId: null,
  isActive: true,
};

export default function DoorForm({ categoryId, categorySlug, door, defaultCollectionId }: DoorFormProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DoorFormState>(
    door
      ? {
          name: door.name,
          slug: door.slug,
          basePriceCents: door.basePriceCents,
          imageUrl: door.imageUrl ?? "",
          description: door.description ?? "",
          collectionId: door.collectionId ?? null,
          doorType: (door as any).doorType ?? 'STANDARD',
          isActive: door.isActive,
        }
      : { ...EMPTY_FORM, collectionId: defaultCollectionId ?? null, doorType: 'STANDARD' },
  );

  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const collectionsQuery = useQuery({
    queryKey: ['collections', categorySlug],
    queryFn: () => getCollections(categorySlug!),
    enabled: categorySlug === 'interior',
  });

  const mutation = useMutation({
    mutationFn: async (data: DoorFormState) => {
      // Generate a slug from name if creating a new door and slug is empty
      const ensureSlug = (name: string, current?: string) => {
        if (door) return current ?? door.slug;
        const base = (current && current.trim().length > 0 ? current : name).toLowerCase();
        const s = base
          .normalize('NFD')
          .replace(/\p{Diacritic}+/gu, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .replace(/-{2,}/g, '-');
        return s || `door-${Date.now()}`;
      };
      const payload = {
        name: data.name,
        slug: ensureSlug(data.name, data.slug),
        basePriceCents: Math.round(data.basePriceCents),
        imageUrl: data.imageUrl || null,
        description: data.description || null,
        collectionId: categorySlug === 'interior' ? data.collectionId ?? null : null,
        ...(categorySlug === 'concealed' ? { doorType: data.doorType ?? 'STANDARD' } : {}),
        isActive: data.isActive,
      };

      const response = await fetch(
        door ? `${API_ORIGIN}/api/products/${door.id}` : `${API_ORIGIN}/api/products`,
        {
          method: door ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            door
              ? payload
              : {
                  ...payload,
                  ...(categoryId ? { categoryId } : {}),
                  ...(categorySlug ? { categorySlug } : {}),
                },
          ),
          credentials: 'include',
        },
      );

      if (!response.ok) {
        let msg = "Failed to save door";
        try { const b = await response.json(); if (b?.error) msg = b.error; } catch {}
        throw new Error(msg);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doors"] });
      setOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to save door";
      setError(message);
      toast({ title: "Save failed", description: message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    if (door) {
      setForm({
        name: door.name,
        slug: door.slug,
        basePriceCents: door.basePriceCents,
        imageUrl: door.imageUrl ?? "",
        description: door.description ?? "",
        collectionId: door.collectionId ?? null,
        isActive: door.isActive,
      });
    } else {
      // Preserve default collection when creating a new door inside a selected collection
      setForm({ ...EMPTY_FORM, collectionId: defaultCollectionId ?? null });
    }
  };

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>{door ? "Редагувати" : "Додати двері"}</Button>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{door ? "Редагувати двері" : "Додати двері"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate(form);
            }}
            className="space-y-4"
          >
            {form.imageUrl && (
              <div className="flex items-center gap-3">
                <img
                  src={resolveImageUrl(form.imageUrl) || undefined}
                  alt="preview"
                  className="h-12 w-12 object-cover rounded border"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                />
                <span className="text-xs text-muted-foreground">Поточне зображення</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Зображення товару</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setError(null);
                  setUploading(true);
                  try {
                    const url = await uploadImage(file);
                    setForm((prev) => ({ ...prev, imageUrl: url }));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              {uploading && <p className="text-xs text-muted-foreground">Завантаження...</p>}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <Input
              required
              placeholder="Назва дверей"
              value={form.name}
              onChange={(event) => {
                const name = event.target.value;
                if (!door) {
                  const auto = name
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/\p{Diacritic}+/gu, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .replace(/-{2,}/g, '-');
                  setForm({ ...form, name, slug: auto });
                } else {
                  setForm({ ...form, name });
                }
              }}
            />
            {/* Slug is auto-generated for new items and preserved on edit. */}
            {/* Collection select for Interior */}
            {categorySlug === 'interior' && !defaultCollectionId && (
              <div className="space-y-2">
                <Label>Колекція</Label>
                <Select value={form.collectionId ? String(form.collectionId) : ''} onValueChange={(v) => setForm({ ...form, collectionId: Number(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть колекцію" />
                  </SelectTrigger>
                  <SelectContent>
                    {collectionsQuery.data?.map((c: Collection) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Door type for Concealed */}
            {categorySlug === 'concealed' && (
              <div className="space-y-2">
                <Label>Тип дверей</Label>
                <Select value={form.doorType ?? 'STANDARD'} onValueChange={(v) => setForm({ ...form, doorType: v as any })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Стандарт</SelectItem>
                    <SelectItem value="BUDGET">Бюджет (Універсальні)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <Input
              required
              type="number"
              step="0.01"
              min="0"
              placeholder="Базова ціна (GBP)"
              value={form.basePriceCents ? (form.basePriceCents / 100).toString() : ""}
              onChange={(event) => {
                const next = parseFloat(event.target.value);
                setForm({
                  ...form,
                  basePriceCents: Number.isNaN(next) ? 0 : Math.round(next * 100),
                });
              }}
            />
            {/* Description (used for Concealed types) */}
            <div className="space-y-2">
              <Label>Опис</Label>
              <Textarea rows={3} placeholder="Короткий опис" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="door-active">Активний</Label>
              <Switch
                id="door-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={mutation.isPending || uploading}>
              {mutation.isPending ? "Збереження..." : uploading ? "Завантаження..." : "Зберегти"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
