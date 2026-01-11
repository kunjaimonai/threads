import { LayoutDashboard, Sparkles, History, Settings } from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: false },
    { icon: Sparkles, label: 'Authenticate', active: true },
    { icon: History, label: 'History', active: false },
    { icon: Settings, label: 'Settings', active: false },
  ];

  return (
    <aside className="w-64 bg-[#1a2332] border-r border-slate-800 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <span className="text-xl font-bold text-white">LuxeAuth</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.label}>
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  item.active
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">A</span>
          </div>
          <div className="flex-1">
            <div className="text-white font-medium text-sm">Alex S.</div>
            <div className="text-slate-400 text-xs">Premium</div>
          </div>
        </div>
      </div>
    </aside>
  );
}