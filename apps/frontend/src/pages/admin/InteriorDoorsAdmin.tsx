import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCollection, deleteCollection, getCategories, getCollections, updateCollection, resolveImageUrl } from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { uploadImage } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function InteriorDoorsAdmin() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const interior = categories?.find((c) => c.slug === "interior");

  const qc = useQueryClient();
  const collections = useQuery({
    queryKey: ['collections', 'interior'],
    queryFn: () => getCollections('interior'),
    enabled: Boolean(interior),
  });

  const add = useMutation({
    mutationFn: ({ name, slug, imageUrl }: { name: string; slug: string; imageUrl?: string | null }) => createCollection('interior', { name, slug, imageUrl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections', 'interior'] }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => deleteCollection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections', 'interior'] }),
  });
  const editMut = useMutation({
    mutationFn: ({ id, name, slug, imageUrl }: { id: number; name?: string; slug?: string; imageUrl?: string | null }) => updateCollection(id, { name, slug, imageUrl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collections', 'interior'] }),
  });
  const { toast } = useToast();
  const [edit, setEdit] = React.useState<{ id: number; name: string; slug: string; imageUrl?: string | null } | null>(null);
  const [addImageUrl, setAddImageUrl] = React.useState<string | null>(null);

  // No inline door list here; clicking a collection navigates to a dedicated page.

  const navigate = useNavigate();
  return (
    <div>
      <br />
      <br />
      <br />
      <br />
      <h1 className="text-3xl font-bold mb-6">Керування міжкімнатними дверима</h1>
      {isLoading && <p>Завантаження…</p>}
      {!isLoading && !interior && <p className="text-sm text-muted-foreground">Категорію «Міжкімнатні» не знайдено.</p>}

      {interior && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Колекції</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {collections.data?.map((c) => (
              <Card key={c.id} className="p-0 overflow-hidden">
                <div className="flex items-stretch justify-between">
                  {/* Make the whole left area a link */}
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/interior-doors/${c.slug}`)}
                    className="flex-1 text-left p-5 hover:bg-muted/40 transition flex gap-4 items-center"
                  >
                    {c.imageUrl && (
                      <img src={resolveImageUrl(c.imageUrl) || ''} alt={c.name} className="h-12 w-12 object-cover rounded border" onError={(e) => { e.currentTarget.style.display='none'; }} />
                    )}
                    <div className="font-medium text-lg">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.slug}</div>
                  </button>
                  <div className="p-5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">•••</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEdit({ id: c.id, name: c.name, slug: c.slug, imageUrl: c.imageUrl })}>Редагувати</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => { const ok = window.confirm('Ви впевнені? Це видалить УСІ двері в цій колекції.'); if (ok) remove.mutate(c.id); }}>Видалити</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
            {collections.isLoading && <p>Завантаження колекцій…</p>}
          </div>

          <form
            className="mt-4 space-y-2 max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget as HTMLFormElement);
              const name = String(fd.get('name') || '').trim();
              const slug = String(fd.get('slug') || '').trim();
              const imageUrl = addImageUrl || String(fd.get('imageUrl') || '');
              if (!name || !slug) return;
              add.mutate({ name, slug, imageUrl: imageUrl || undefined });
              (e.currentTarget as HTMLFormElement).reset();
              setAddImageUrl(null);
            }}
          >
            <h3 className="font-semibold">Додати колекцію</h3>
            <Input name="name" placeholder="Назва (напр., Classic)" />
            <Input name="slug" placeholder="Слаг (напр., classic)" />
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Зображення</label>
              {addImageUrl && (
                <img src={resolveImageUrl(addImageUrl) || ''} className="h-12 w-12 object-cover rounded border" />
              )}
              <Input name="imageUrl" placeholder="/uploads/your-image.jpg" value={addImageUrl ?? ''} onChange={(e) => setAddImageUrl(e.target.value)} />
              <input type="file" accept="image/*" onChange={async (e) => {
                const f = e.currentTarget.files?.[0];
                if (!f) return;
                try {
                  const url = await uploadImage(f);
                  setAddImageUrl(url);
                  toast({ title: 'Зображення завантажено' });
                } catch (err) {
                  toast({ title: 'Не вдалося завантажити', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
                }
              }} />
            </div>
            <Button type="submit" disabled={add.isPending}>{add.isPending ? 'Додавання…' : 'Додати колекцію'}</Button>
          </form>

          {/* Edit dialog */}
          <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Редагувати колекцію</DialogTitle>
              </DialogHeader>
              {edit && (
                <form
                  className="space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget as HTMLFormElement);
                    const name = String(fd.get('name') || edit.name).trim();
                    const slug = String(fd.get('slug') || edit.slug).trim();
                    const url = String(fd.get('imageUrl') || edit.imageUrl || '');
                    await editMut.mutateAsync({ id: edit.id, name, slug, imageUrl: url || null });
                    setEdit(null);
                  }}
                >
                  <Input name="name" defaultValue={edit.name} placeholder="Назва" />
                  <Input name="slug" defaultValue={edit.slug} placeholder="Слаг" />
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Зображення</label>
                    {edit.imageUrl && <img src={resolveImageUrl(edit.imageUrl) || ''} className="h-12 w-12 object-cover rounded border" />}
                    <Input name="imageUrl" value={edit.imageUrl ?? ''} onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })} placeholder="/uploads/your-image.jpg" />
                    <input type="file" accept="image/*" onChange={async (e) => {
                      const f = e.currentTarget.files?.[0]; if (!f) return;
                      try { const url = await uploadImage(f); setEdit({ ...edit, imageUrl: url }); toast({ title: 'Зображення завантажено' }); } catch(err) { toast({ title: 'Не вдалося завантажити', description: err instanceof Error ? err.message : String(err), variant: 'destructive' }); }
                    }} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setEdit(null)}>Скасувати</Button>
                    <Button type="submit" disabled={editMut.isPending}>{editMut.isPending ? 'Збереження…' : 'Зберегти'}</Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
