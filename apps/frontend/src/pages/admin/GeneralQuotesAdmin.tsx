import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ORIGIN } from "@/services/api";

type Inquiry = {
  id: number;
  type: "GENERAL" | "FURNITURE";
  name: string;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  delivered: boolean;
  adminNotes?: string | null;
  createdAt: string;
};

async function fetchGeneralInquiries(): Promise<Inquiry[]> {
  const res = await fetch(`${API_ORIGIN}/api/admin/inquiries?type=GENERAL`, { credentials: 'include' });
  if (!res.ok) throw new Error("Failed to load general inquiries");
  return res.json();
}

export default function GeneralQuotesAdmin() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["general-inquiries"], queryFn: fetchGeneralInquiries });

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<Inquiry> & { id: number }) => {
      const res = await fetch(`${API_ORIGIN}/api/admin/inquiries/${payload.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivered: payload.delivered, adminNotes: payload.adminNotes }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Update failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["general-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  return (
    <div>
      <br />
      <br />
      <br />
      <br />
      <h1 className="text-3xl font-bold mb-6">General Quotes</h1>
      <p className="mb-6 text-muted-foreground">Submissions from the contact form.</p>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-500">Failed to load</p>}
      {!isLoading && !error && (
        <div className="max-w-full overflow-x-auto">
          <table className="w-max min-w-[1000px] text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2 whitespace-nowrap">Created</th>
                <th className="p-2 whitespace-nowrap">Name</th>
                <th className="p-2 whitespace-nowrap">Email</th>
                <th className="p-2 whitespace-nowrap">Phone</th>
                <th className="p-2 whitespace-nowrap">Message</th>
                <th className="p-2 whitespace-nowrap">Delivered</th>
                <th className="p-2 whitespace-nowrap">Admin Notes</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((q) => (
                <tr key={q.id} className="border-b">
                  <td className="p-2 whitespace-nowrap">{new Date(q.createdAt).toLocaleString()}</td>
                  <td className="p-2 whitespace-nowrap">{q.name}</td>
                  <td className="p-2 whitespace-nowrap">{q.email}</td>
                  <td className="p-2 whitespace-nowrap">{q.phone || '-'}</td>
                  <td className="p-2 max-w-xl">{q.message}</td>
                  <td className="p-2 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={q.delivered}
                      onChange={(e) => updateMutation.mutate({ id: q.id, delivered: e.target.checked })}
                    />
                  </td>
                  <td className="p-2 min-w-[240px]">
                    <input
                      className="border rounded px-2 py-1 w-full"
                      defaultValue={q.adminNotes ?? ''}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val !== (q.adminNotes ?? '')) {
                          updateMutation.mutate({ id: q.id, adminNotes: val });
                        }
                      }}
                      placeholder="Add note..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
