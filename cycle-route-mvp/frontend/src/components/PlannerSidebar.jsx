import { motion } from 'motion/react'
import {
  IconArrowLeft,
  IconBookmark,
  IconHome,
  IconMapRoute,
  IconRoute,
  IconUser,
} from '@tabler/icons-react'
import { Sidebar, SidebarBody, SidebarLink } from './ui/sidebar'

function SidebarLogo({ open }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-[#2e5f43]" />
      <motion.span
        animate={{ opacity: open ? 1 : 0, display: open ? 'inline-block' : 'none' }}
        className="text-sm font-semibold tracking-wide text-[#2e5f43]"
      >
        Cycle Your Way
      </motion.span>
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
    { id: 'home', label: 'Start', onClick: onGoHome, icon: IconHome, active: false },
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
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#ebe3d6] bg-[#fcfaf5] px-2 py-2 md:hidden">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-medium transition ${
              item.active
                ? 'bg-[#eef7f0] text-[#2e5f43]'
                : 'text-stone-600 hover:bg-[#f4faf4]'
            }`}
          >
            <Icon className="h-5 w-5" stroke={1.75} />
            {item.label}
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
      label: 'Strona główna',
      onClick: onGoHome,
      active: false,
      icon: <IconHome className="h-5 w-5 shrink-0 text-[#2e5f43]" stroke={1.75} />,
    },
    {
      label: 'Trasa A → B',
      onClick: () => onRouteModeChange('AtoB'),
      active: plannerPanel === 'plan' && routeMode === 'AtoB',
      icon: (
        <IconRoute
          className={`h-5 w-5 shrink-0 ${
            plannerPanel === 'plan' && routeMode === 'AtoB'
              ? 'text-[#2e5f43]'
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
              ? 'text-[#2e5f43]'
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
          className={`h-5 w-5 shrink-0 ${savedActive ? 'text-[#2e5f43]' : 'text-[#7a6248]'}`}
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

          <div className="border-t border-[#ebe3d6] pt-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2e5f43] text-xs font-semibold text-white">
                    {(userEmail?.[0] || 'U').toUpperCase()}
                  </span>
                  <motion.span
                    animate={{
                      display: open ? 'inline-block' : 'none',
                      opacity: open ? 1 : 0,
                    }}
                    className="truncate text-sm text-stone-700"
                    title={userEmail}
                  >
                    {userEmail}
                  </motion.span>
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
                  icon: <IconUser className="h-5 w-5 shrink-0 text-[#2e5f43]" stroke={1.75} />,
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
