<template>
  <div class="relative size-21" aria-hidden="true">
    <span class="absolute inset-0 animate-radar rounded-full border border-primary/50 motion-reduce:hidden" />
    <span class="absolute inset-0 animate-radar rounded-full border border-primary/50 [animation-delay:1.5s] motion-reduce:hidden" />
    <div class="panel relative flex size-full items-center justify-center rounded-xl">
      <svg width="62" height="62" viewBox="0 0 64 64" fill="none">
        <defs>
          <linearGradient id="logo-pulse" x1="0" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" :stop-color="THEME_COLORS.primary" stop-opacity="0.2" />
            <stop offset="0.5" :stop-color="THEME_COLORS.primary" />
            <stop offset="1" :stop-color="THEME_COLORS.success" />
          </linearGradient>
        </defs>
        <g :stroke="THEME_COLORS.primary" stroke-opacity="0.35" stroke-width="1.5">
          <path d="M12 16 L32 10 L52 18 M12 16 L14 50 L50 48 L52 18 M32 10 L32 54" />
        </g>
        <g :fill="THEME_COLORS.primary" fill-opacity="0.6">
          <circle cx="12" cy="16" r="2.5" />
          <circle cx="32" cy="10" r="2.5" />
          <circle cx="52" cy="18" r="2.5" />
          <circle cx="14" cy="50" r="2.5" />
          <circle cx="50" cy="48" r="2.5" />
        </g>
        <path
          d="M4 34 H18 L23 24 L30 46 L37 16 L43 34 H60"
          stroke="url(#logo-pulse)"
          stroke-width="4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="60" cy="34" r="3.5" :fill="THEME_COLORS.success" />
      </svg>
    </div>
  </div>
</template>

