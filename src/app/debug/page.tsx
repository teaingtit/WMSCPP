import { createClient } from '@/lib/supabase/server';

export default async function DebugPage() {
  const supabase = await createClient();

  const { data: warehouses, error: whError } = await supabase.from('warehouses').select('*');
  const { data: user, error: userError } = await supabase.auth.getUser();

  return (
    <div className="p-10 font-mono space-y-4">
      <h1 className="text-2xl font-bold">Debug Info</h1>

      <div className="border p-4 rounded bg-gray-100">
        <h2 className="font-bold">Auth User</h2>
        <pre>{JSON.stringify({ user, userError }, null, 2)}</pre>
      </div>

      <div className="border p-4 rounded bg-gray-100">
        <h2 className="font-bold">Warehouses</h2>
        {whError ? (
          <div className="text-red-500">{JSON.stringify(whError, null, 2)}</div>
        ) : (
          <pre>{JSON.stringify(warehouses, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
