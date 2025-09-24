import { Link, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-100 p-6">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
        <nav className="flex flex-col gap-3">
          <Link to="/admin/interior-doors">Interior Doors</Link>
          <Link to="/admin/concealed-doors">Concealed Doors</Link>
          <Link to="/admin/furniture">Cabinet Furniture</Link>
          <Link to="/admin/quotes">Quotes</Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-10">
        <Outlet />
      </main>
    </div>
  );
}
