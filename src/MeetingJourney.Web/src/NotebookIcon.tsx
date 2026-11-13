export type NotebookIconName = 'image' | 'share' | 'save' | 'fill' | 'pen' | 'highlighter' | 'eraser' | 'smudge' | 'undo' | 'redo' | 'pages' | 'more' | 'download' | 'trash' | 'plus' | 'close' | 'note' | 'heart' | 'clue' | 'expand' | 'home' | 'route' | 'treasure' | 'settings' | 'book' | 'grid' | 'list' | 'calendar' | 'back' | 'next' | 'external' | 'music' | 'check' | 'chevron-down' | 'clock' | 'pin';

export function NotebookIcon({ name }: { name: NotebookIconName }) {
  const shapes = {
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m3 17 5-5 4 4 4-6 5 7"/></>,
    share: <><path d="M12 15V3m-4 4 4-4 4 4M7 10H4v11h16V10h-3"/></>,
    save: <><path d="M4 3h13l4 4v14H3V3ZM7 3v6h10V3M7 21v-8h10v8" /></>,
    fill: <><path d="m5 3 12 12-7 6-9-9 7-7m-6 7h15M19 11s-3 4-3 6a3 3 0 0 0 6 0c0-2-3-6-3-6Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18M7 14h3m4 0h3M7 17h3" /></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    'chevron-down': <path d="m6 9 6 6 6-6" />,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
    route: <><circle cx="5" cy="19" r="2" /><circle cx="19" cy="5" r="2" /><path d="M7 19h8a4 4 0 0 0 0-8H9a3 3 0 0 1 0-6h8" /></>,
    treasure: <><path d="M3 11V8a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v3M3 11h18v9H3ZM8 3v8m8-8v8M8 11v9m8-9v9" /><rect x="10" y="10" width="4" height="5" rx="1" /></>,
    settings: <><path d="m10 3-1 3-3-1-2 3 2 3-2 2 2 4 3-1 1 3h4l1-3 3 1 2-4-2-2 2-3-2-3-3 1-1-3Z" /><circle cx="12" cy="11" r="3" /></>,
    book: <><path d="M12 5v16M12 5C9 3 5 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 1Z" /></>,
    grid: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></>,
    list: <><path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1" /></>,
    back: <path d="m14 5-7 7 7 7" />,
    next: <path d="m10 5 7 7-7 7" />,
    external: <><path d="M14 3h7v7m0-7L10 14M11 5H4v15h15v-7" /></>,
    music: <><path d="M9 18V5l11-2v13M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="2" /><ellipse cx="17" cy="16" rx="3" ry="2" /></>,
    check: <path d="m4 12 5 5L20 6" />,
    pen: <><path d="m4 16-1 5 5-1L20 8l-4-4Z" /><path d="m14 6 4 4M4 16l4 4" /></>,
    highlighter: <><path d="m7 13 7-9 6 5-7 8Z" /><path d="m7 13-3 4 5 4 4-4M3 22h13" /></>,
    eraser: <><path d="m3 14 9-10a2 2 0 0 1 3 0l6 6a2 2 0 0 1 0 3l-8 8H9l-6-4a2 2 0 0 1 0-3Z" /><path d="m8 9 9 8M13 21h9" /></>,
    smudge: <><path d="M9 18V6a2 2 0 0 1 4 0v7l2-3a2 2 0 0 1 3 2l-3 7H9l-4-5a2 2 0 0 1 3-2l1 1M4 21h13" /></>,
    undo: <><path d="m8 4-5 5 5 5" /><path d="M3 9h10a7 7 0 0 1 0 14" /></>,
    redo: <><path d="m16 4 5 5-5 5" /><path d="M21 9H11a7 7 0 0 0 0 14" /></>,
    pages: <><rect x="7" y="3" width="14" height="17" rx="2" /><path d="M4 7H3v15h13M11 8h6M11 12h6" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    note: <><path d="M15 3H4v18h16V8Z" /><path d="M14 3v6h6M8 13h8M8 17h6" /></>,
    heart: <path d="M12 21 3.5 12.5C-2 6 6 0 12 6c6-6 14 0 8.5 6.5Z" />,
    clue: <><circle cx="10" cy="10" r="6" /><path d="m14.5 14.5 6 6M10 7v3m0 3h.01" /></>,
    expand: <><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" /><path d="m3 3 6 6m12-6-6 6M3 21l6-6m12 6-6-6" /></>
  };
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>;
}
