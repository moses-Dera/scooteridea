import { FiSearch, FiPlus, FiX, FiEdit2, FiTrash2 } from 'react-icons/fi';

interface UsersTabProps {
  users: any[];
  setUsers: (users: any[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  editingUser: any;
  setEditingUser: (u: any) => void;
  tempAssignedZones: string[];
  setTempAssignedZones: (z: string[]) => void;
  zones: any[];
  handleAddOperator: () => void;
  handleDeleteUser: (id: string) => void;
  handleSaveUserZones: (id: string) => void;
}

export default function UsersTab({
  users,
  setUsers,
  searchQuery,
  setSearchQuery,
  editingUser,
  setEditingUser,
  tempAssignedZones,
  setTempAssignedZones,
  zones,
  handleAddOperator,
  handleDeleteUser,
  handleSaveUserZones,
}: UsersTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <p className="text-slate-400">Manage dashboard access and operator accounts.</p>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search operators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary w-full sm:w-64"
            />
          </div>
        </div>
        <button
          onClick={handleAddOperator}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-lg transition-colors border border-slate-600 shrink-0"
        >
          <FiPlus /> Add Operator
        </button>
      </div>

      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden relative">
        {editingUser ? (
          <div className="p-6 bg-slate-900 border-b border-white/10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-white text-lg">Assign Zones</h3>
                <p className="text-sm text-slate-400">
                  Select the geofence zones {editingUser.name} is allowed to manage.
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto mb-4 p-2 border border-slate-800 rounded bg-slate-900/50">
              {zones.map((z) => {
                const isAssigned = tempAssignedZones.includes(z.id);
                return (
                  <label
                    key={z.id}
                    className={`flex items-center gap-3 p-3 rounded cursor-pointer border transition-colors ${isAssigned ? 'border-primary bg-primary/10' : 'border-slate-700 bg-slate-800 hover:border-slate-500'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={(e) => {
                        if (e.target.checked) setTempAssignedZones([...tempAssignedZones, z.id]);
                        else setTempAssignedZones(tempAssignedZones.filter((id) => id !== z.id));
                      }}
                      className="w-5 h-5 accent-primary"
                    />
                    <div>
                      <div className="font-medium text-white text-sm">{z.name}</div>
                      <div className="text-xs text-slate-400 uppercase">{z.type}</div>
                    </div>
                  </label>
                );
              })}
              {zones.length === 0 && (
                <p className="text-slate-500 col-span-full">No zones created yet.</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveUserZones(editingUser.id)}
                className="bg-primary text-black font-bold px-6 py-2 rounded hover:bg-primary/90"
              >
                Save Assignments
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium text-slate-300">User</th>
                  <th className="px-6 py-4 font-medium text-slate-300">Role</th>
                  <th className="px-6 py-4 font-medium text-slate-300">Assigned Zones</th>
                  <th className="px-6 py-4 font-medium text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {users
                  .filter(
                    (u) =>
                      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchQuery.toLowerCase()),
                  )
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{u.name}</div>
                        <div className="text-slate-500 text-xs">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-slate-800 text-slate-300'}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs whitespace-normal max-w-xs">
                        {u.assignedZones?.length > 0
                          ? u.assignedZones.map((z: any) => z.name).join(', ')
                          : 'Global Access'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => {
                              setEditingUser(u);
                              setTempAssignedZones(u.assignedZones?.map((z: any) => z.id) || []);
                            }}
                            className="text-blue-400 hover:text-blue-300 p-2"
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-400 hover:text-red-300 p-2"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No staff found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
