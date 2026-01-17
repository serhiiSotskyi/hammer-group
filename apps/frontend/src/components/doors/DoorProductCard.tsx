import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resolveImageUrl } from "@/services/api";

type DoorProductCardProps = {
  name: string;
  imageUrl?: string | null;
  priceLabel: string;
  ctaLabel: string;
  href: string;
};

export default function DoorProductCard({
  name,
  imageUrl,
  priceLabel,
  ctaLabel,
  href,
}: DoorProductCardProps) {
  return (
    <Card className="door-card door-card-root">
      <div className="door-card-media">
        <img
          src={resolveImageUrl(imageUrl) || "/placeholder.svg"}
          alt={name}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
      </div>
      <CardHeader className="px-2 pt-2 pb-1">
        <CardTitle className="door-card-title text-base sm:text-lg font-semibold">{name}</CardTitle>
      </CardHeader>
      <CardContent className="door-card-body px-2 pt-0 pb-2">
        <div className="door-card-footer">
          <p className="text-lg sm:text-xl font-bold">{priceLabel}</p>
          <Link to={href}>
            <Button className="w-full premium-button py-1.5 text-sm leading-none">{ctaLabel}</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
