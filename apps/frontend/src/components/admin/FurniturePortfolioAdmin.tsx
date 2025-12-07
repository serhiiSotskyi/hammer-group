import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { resolveImageUrl, uploadImage, API_ORIGIN } from "@/services/api";

type Item = { id: number; name: string; coverUrl: string; albumUrls: string[] };

async function listItems(): Promise<Item[]> {
  const res = await fetch(`${API_ORIGIN}/api/furniture/portfolio`);
  if (!res.ok) throw new Error("Failed to load portfolio");
  return res.json();
}

export default function FurniturePortfolioAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["f-portfolio"], queryFn: listItems });
  const [editing, setEditing] = useState<Item | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [name, setName] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [albumUrls, setAlbumUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = JSON.stringify({ name, coverUrl, albumUrls });
      const res = await fetch(
        editing ? `${API_ORIGIN}/api/furniture/portfolio/${editing.id}` : `${API_ORIGIN}/api/furniture/portfolio`,
        { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body },
      );
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => {
      setEditing(null); setName(""); setCoverUrl(null); setAlbumUrls([]); setShowEditor(false);
      qc.invalidateQueries({ queryKey: ["f-portfolio"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_ORIGIN}/api/furniture/portfolio/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["f-portfolio"] }),
  });

  const startEdit = (item?: Item) => {
    if (item) {
      setEditing(item);
      setName(item.name);
      setCoverUrl(item.coverUrl);
      setAlbumUrls(item.albumUrls || []);
    } else {
      setEditing(null);
      setName("");
      setCoverUrl(null);
      setAlbumUrls([]);
    }
    setShowEditor(true);
  };

  const onCoverFile = async (file: File) => {
    setUploading(true);
    try { const url = await uploadImage(file); setCoverUrl(url); } finally { setUploading(false); }
  };

  const onAlbumFiles = async (files: FileList) => {
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const f of Array.from(files)) {
        const url = await uploadImage(f);
        uploaded.push(url);
      }
      setAlbumUrls((prev) => [...prev, ...uploaded]);
    } finally { setUploading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Портфоліо меблів</h2>
        <Button onClick={() => startEdit()}>Додати елемент</Button>
      </div>

      {/* Editor */}
      {showEditor && (
        <Card className="p-4 space-y-3">
          {/* Cover upload */}
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded border bg-muted overflow-hidden">
              {coverUrl ? <img src={resolveImageUrl(coverUrl) || undefined} className="object-cover w-full h-full" /> : null}
            </div>
            <div className="flex items-center gap-2">
              <Input type="file" accept="image/*" onChange={(e) => e.target.files && onCoverFile(e.target.files[0])} />
              {uploading && <span className="text-xs text-muted-foreground">Завантаження...</span>}
            </div>
          </div>

          {/* Album upload */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Зображення альбому</div>
            <div className="flex flex-wrap gap-2">
              {albumUrls.map((u, idx) => (
                <div key={idx} className="relative w-16 h-16 border rounded overflow-hidden">
                  <img src={resolveImageUrl(u) || undefined} className="object-cover w-full h-full" />
                  <button type="button" className="absolute -top-2 -right-2 bg-white border rounded-full px-1 text-xs"
                    onClick={() => setAlbumUrls(albumUrls.filter((_, i) => i !== idx))}>×</button>
                </div>
              ))}
            </div>
            <Input type="file" multiple accept="image/*" onChange={(e) => e.target.files && onAlbumFiles(e.target.files)} />
          </div>
          <Input placeholder="Назва" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2">
            <Button disabled={!name || !coverUrl || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Збереження..." : "Зберегти"}
            </Button>
            <Button variant="outline" onClick={() => { setEditing(null); setName(""); setCoverUrl(null); setAlbumUrls([]); setShowEditor(false); }}>Скасувати</Button>
          </div>
        </Card>
      )}

      {/* List */}
      <div className="grid gap-3">
        {isLoading && <p>Завантаження...</p>}
        {data?.map((it) => (
          <Card key={it.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={resolveImageUrl(it.coverUrl) || undefined} alt={it.name} className="h-12 w-12 object-cover rounded border" />
              <span className="font-medium">{it.name}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => startEdit(it)}>Редагувати</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(it.id)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Видалення..." : "Видалити"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
