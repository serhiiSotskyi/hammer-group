import { Link, Outlet, useNavigate } from "react-router-dom";
import { authLogout, API_ORIGIN } from "@/services/api";
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
      const res = await fetch(`${API_ORIGIN}/api/admin/stats`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to load admin stats");
      return res.json();
    },
    refetchInterval: 30000,
  });
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 p-6">
        <h2 className="text-xl font-bold mb-6">Адмін-панель</h2>
        <nav className="flex flex-col gap-3">
          <Link to="/admin/interior-doors">Міжкімнатні двері</Link>
          <Link to="/admin/concealed-doors">Приховані двері</Link>
          <Link to="/admin/furniture-portfolio">Портфоліо меблів</Link>
          <Link to="/admin/furniture-quotes">
            Заявки на меблі
            {stats?.undelivered?.furniture ? (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-xs px-2 py-0.5">
                {stats.undelivered.furniture}
              </span>
            ) : null}
          </Link>
          <Link to="/admin/quotes">
            Заявки на двері
            {stats?.undelivered?.doorQuotes ? (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-xs px-2 py-0.5">
                {stats.undelivered.doorQuotes}
              </span>
            ) : null}
          </Link>
          <Link to="/admin/general-quotes">
            Загальні заявки
            {stats?.undelivered?.general ? (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-xs px-2 py-0.5">
                {stats.undelivered.general}
              </span>
            ) : null}
          </Link>
          <Link to="/admin/currencies">Валюти</Link>
          <Link to="/admin/pricing">Ціноутворення (Міжкімнатні)</Link>
          <Link to="/admin/pricing-concealed">Ціноутворення (Приховані)</Link>
        </nav>
        <button
          className="mt-6 text-sm underline"
          onClick={async () => {
            await authLogout();
            navigate('/admin/login');
          }}
        >
          Вийти
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-10">
        <Outlet />
      </main>
    </div>
  );
}
