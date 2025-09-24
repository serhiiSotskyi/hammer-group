import DoorTable from "@/components/admin/DoorTable";

export default function InteriorDoorsAdmin() {
  return (
    <div>
        <br /><br /><br /><br />
      <h1 className="text-3xl font-bold mb-6">Manage Interior Doors</h1>
      <DoorTable categoryId={1} /> {/* Interior Doors category ID */}
    </div>
  );
}
