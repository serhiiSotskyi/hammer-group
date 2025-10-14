import { Link, Outlet, useNavigate } from "react-router-dom";
import { authLogout } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

type AdminStats = {
  undelivered: { doorQuotes: number; general: number; furniture: number };
  totals: { quotes: number; inquiries: number };
  updatedAt: string;
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("http://localhost:4000/api/admin/stats", { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to load admin stats");
      return res.json();
    },
    refetchInterval: 30000,
  });
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 p-6">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
        <nav className="flex flex-col gap-3">
          <Link to="/admin/interior-doors">Interior Doors</Link>
          <Link to="/admin/concealed-doors">Concealed Doors</Link>
          <Link to="/admin/furniture-portfolio">Furniture Portfolio</Link>
          <Link to="/admin/furniture-quotes">
            Furniture Quotes
            {stats?.undelivered?.furniture ? (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-xs px-2 py-0.5">
                {stats.undelivered.furniture}
              </span>
            ) : null}
          </Link>
          <Link to="/admin/quotes">
            Door Quotes
            {stats?.undelivered?.doorQuotes ? (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-xs px-2 py-0.5">
                {stats.undelivered.doorQuotes}
              </span>
            ) : null}
          </Link>
          <Link to="/admin/general-quotes">
            General Quotes
            {stats?.undelivered?.general ? (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-xs px-2 py-0.5">
                {stats.undelivered.general}
              </span>
            ) : null}
          </Link>
          <Link to="/admin/currencies">Currencies</Link>
          <Link to="/admin/pricing">Pricing (Interior)</Link>
          <Link to="/admin/pricing-concealed">Pricing (Concealed)</Link>
        </nav>
        <button
          className="mt-6 text-sm underline"
          onClick={async () => {
            await authLogout();
            navigate('/admin/login');
          }}
        >
          Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-10">
        <Outlet />
      </main>
    </div>
  );
}
