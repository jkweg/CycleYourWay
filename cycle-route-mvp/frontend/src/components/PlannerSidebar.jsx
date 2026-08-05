import {
  IconArrowLeft,
  IconBookmark,
  IconHome,
  IconMapRoute,
  IconRoute,
  IconUser,
} from '@tabler/icons-react'
import { Sidebar, SidebarBody, SidebarLink } from './ui/sidebar'
import { isNativePlatform } from '../lib/platform'

function SidebarLogo({ open }) {
  return (
    <div className="flex items-center gap-2 overflow-hidden px-2 py-1">
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-[#FC6C26]" />
      <span
        className={`whitespace-nowrap text-sm font-semibold tracking-wide text-[#FC6C26] transition-[opacity,max-width] duration-150 ${
          open ? 'max-w-[10rem] opacity-100' : 'max-w-0 opacity-0'
        }`}
      >
        Cycle Your Way
      </span>
    </div>
  )
}

function MobilePlannerNav({
  onGoHome,
  onOpenAuth,
  routeMode,
  onRouteModeChange,
  onOpenSaved,
  plannerPanel,
}) {
  const items = [
    {
      id: 'home',
      label: isNativePlatform() ? 'Planer' : 'Start',
      onClick: onGoHome,
      icon: IconHome,
      active: false,
    },
    {
      id: 'atob',
      label: 'A → B',
      onClick: () => onRouteModeChange('AtoB'),
      icon: IconRoute,
      active: plannerPanel === 'plan' && routeMode === 'AtoB',
    },
    {
      id: 'loop',
      label: 'Pętla',
      onClick: () => onRouteModeChange('Loop'),
      icon: IconMapRoute,
      active: plannerPanel === 'plan' && routeMode === 'Loop',
    },
    {
      id: 'saved',
      label: 'Zapisane',
      onClick: onOpenSaved,
      icon: IconBookmark,
      active: plannerPanel === 'saved' || plannerPanel === 'savedDetail',
    },
    { id: 'auth', label: 'Konto', onClick: onOpenAuth, icon: IconUser, active: false },
  ]

  return (
    <nav
      className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-burnt-orange/15 bg-[#FFF8E8]/95 px-1.5 py-2 backdrop-blur md:hidden"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      aria-label="Nawigacja planera"
    >
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt-orange/40 ${
              item.active
                ? 'bg-white font-bold text-burnt-orange shadow-sm ring-1 ring-burnt-orange/15'
                : 'font-medium text-stone-600 hover:bg-vanilla'
            }`}
            aria-current={item.active ? 'page' : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" stroke={1.75} />
            <span className="max-w-full truncate">{item.label}</span>
            {item.active && (
              <span className="absolute inset-x-2 -bottom-1.5 h-0.5 rounded-full bg-burnt-orange" />
            )}
          </button>
        )
      })}
    </nav>
  )
}

function PlannerSidebar({
  open,
  setOpen,
  onGoHome,
  onOpenAuth,
  onLogout,
  isAuthenticated,
  userEmail,
  routeMode,
  onRouteModeChange,
  onOpenSaved,
  plannerPanel = 'plan',
}) {
  const savedActive = plannerPanel === 'saved' || plannerPanel === 'savedDetail'

  const navLinks = [
    {
      label: isNativePlatform() ? 'Planer' : 'Strona główna',
      onClick: onGoHome,
      active: false,
      icon: <IconHome className="h-5 w-5 shrink-0 text-[#FC6C26]" stroke={1.75} />,
    },
    {
      label: 'Trasa A → B',
      onClick: () => onRouteModeChange('AtoB'),
      active: plannerPanel === 'plan' && routeMode === 'AtoB',
      icon: (
        <IconRoute
          className={`h-5 w-5 shrink-0 ${
            plannerPanel === 'plan' && routeMode === 'AtoB'
              ? 'text-[#FC6C26]'
              : 'text-stone-500'
          }`}
          stroke={1.75}
        />
      ),
    },
    {
      label: 'Pętla treningowa',
      onClick: () => onRouteModeChange('Loop'),
      active: plannerPanel === 'plan' && routeMode === 'Loop',
      icon: (
        <IconMapRoute
          className={`h-5 w-5 shrink-0 ${
            plannerPanel === 'plan' && routeMode === 'Loop'
              ? 'text-[#FC6C26]'
              : 'text-stone-500'
          }`}
          stroke={1.75}
        />
      ),
    },
    {
      label: 'Zapisane trasy',
      onClick: onOpenSaved,
      active: savedActive,
      icon: (
        <IconBookmark
          className={`h-5 w-5 shrink-0 ${savedActive ? 'text-[#FC6C26]' : 'text-[#7a6248]'}`}
          stroke={1.75}
        />
      ),
    },
  ]

  return (
    <>
      <MobilePlannerNav
        onGoHome={onGoHome}
        onOpenAuth={onOpenAuth}
        routeMode={routeMode}
        onRouteModeChange={onRouteModeChange}
        onOpenSaved={onOpenSaved}
        plannerPanel={plannerPanel}
      />
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody>
          <div className="flex flex-1 flex-col overflow-hidden">
            <SidebarLogo open={open} />
            <div className="mt-8 flex flex-col gap-1">
              {navLinks.map((link) => (
                <SidebarLink key={link.label} link={link} />
              ))}
            </div>
          </div>

          <div className="border-t border-[#f0d4b8] pt-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FC6C26] text-xs font-semibold text-white">
                    {(userEmail?.[0] || 'U').toUpperCase()}
                  </span>
                  <span
                    className={`truncate text-sm text-stone-700 transition-[opacity,max-width] duration-150 ${
                      open ? 'max-w-[10rem] opacity-100' : 'max-w-0 opacity-0'
                    }`}
                    title={userEmail}
                  >
                    {userEmail}
                  </span>
                </div>
                <SidebarLink
                  link={{
                    label: 'Wyloguj',
                    onClick: onLogout,
                    icon: (
                      <IconArrowLeft className="h-5 w-5 shrink-0 text-stone-600" stroke={1.75} />
                    ),
                  }}
                />
              </>
            ) : (
              <SidebarLink
                link={{
                  label: 'Zaloguj się',
                  onClick: onOpenAuth,
                  icon: <IconUser className="h-5 w-5 shrink-0 text-[#FC6C26]" stroke={1.75} />,
                }}
              />
            )}
          </div>
        </SidebarBody>
      </Sidebar>
    </>
  )
}

export default PlannerSidebar
