import { useSearchParams } from "react-router-dom";
import CustomizerSection from "@/components/InteriorCustomizerV2";

export default function CustomizerPage() {
  const [params] = useSearchParams();
  const slug = params.get("slug") ?? undefined;

  return <CustomizerSection productSlug={slug} />;
}
