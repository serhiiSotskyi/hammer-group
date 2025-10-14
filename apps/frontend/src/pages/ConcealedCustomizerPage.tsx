import { useSearchParams } from "react-router-dom";
import ConcealedCustomizer from "@/components/ConcealedCustomizerSection";

export default function ConcealedCustomizerPage() {
  const [params] = useSearchParams();
  const slug = params.get("slug") ?? undefined;
  return <ConcealedCustomizer productSlug={slug || undefined} />;
}

