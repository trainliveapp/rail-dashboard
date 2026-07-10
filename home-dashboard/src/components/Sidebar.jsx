import SidebarTop from './SidebarTop'
import SidebarBottom from './SidebarBottom'

// Combines both halves into one continuous panel, used on pages that don't
// need the special mobile reordering (the map page splits these apart instead).
export default function Sidebar({ nearby, toggleNearby, layers, toggleLayer, className = '' }) {
  return (
    <aside className={`w-full lg:w-[300px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-full overflow-y-auto ${className}`}>
      <SidebarTop />
      <SidebarBottom nearby={nearby} toggleNearby={toggleNearby} layers={layers} toggleLayer={toggleLayer} />
    </aside>
  )
}
