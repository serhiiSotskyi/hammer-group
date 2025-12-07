import DoorTable from "@/components/admin/DoorTable";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/services/api";

export default function ConcealedDoorsAdmin() {
  const { data: categories, isLoading } = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const concealed = categories?.find((c) => c.slug === "concealed");

  return (
    <div>
      <br />
      <br />
      <br />
      <br />
      <h1 className="text-3xl font-bold mb-6">Керування прихованими дверима</h1>
      {isLoading && <p>Завантаження…</p>}
      {concealed ? (
        <DoorTable categorySlug={concealed.slug} />
      ) : (
        !isLoading && <p className="text-sm text-muted-foreground">Категорію «Приховані» не знайдено.</p>
      )}
    </div>
  );
}
