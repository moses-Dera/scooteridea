interface SupportTabProps {
  tickets: any[];
  handleToggleTicketStatus: (id: string, currentStatus: string) => void;
}

export default function SupportTab({ tickets, handleToggleTicketStatus }: SupportTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-slate-400">View and manage customer help requests and reports.</p>
      </div>

      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 font-medium text-slate-300">Ticket ID</th>
              <th className="px-6 py-4 font-medium text-slate-300">User</th>
              <th className="px-6 py-4 font-medium text-slate-300">Subject & Message</th>
              <th className="px-6 py-4 font-medium text-slate-300 text-center">Status</th>
              <th className="px-6 py-4 font-medium text-slate-300 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {tickets.map((t) => (
              <tr key={t.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                  {t.id.substring(0, 8)}...
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-white">{t.user?.name || 'Unknown'}</div>
                  <div className="text-slate-500 text-xs">{t.user?.email}</div>
                </td>
                <td className="px-6 py-4 max-w-md">
                  <div className="font-medium text-white truncate">{t.subject}</div>
                  <div className="text-slate-500 text-xs line-clamp-2">{t.message}</div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      t.status === 'RESOLVED'
                        ? 'bg-green-500/10 text-green-400'
                        : t.status === 'IN_PROGRESS'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleToggleTicketStatus(t.id, t.status)}
                    className={`font-medium text-xs hover:underline ${t.status === 'RESOLVED' ? 'text-slate-400' : 'text-primary'}`}
                  >
                    {t.status === 'RESOLVED' ? 'Reopen' : 'Mark Resolved'}
                  </button>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No support tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
