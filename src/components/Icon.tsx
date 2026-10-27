import type { CSSProperties } from 'react';
import {
  Image as ImageGlyph, Table2, Sun, Sofa, CalendarX,
  ArrowLeft, ArrowRight, ArrowUpDown, BarChart3, Bell, Calendar, CalendarClock,
  CalendarDays, Check, ChevronDown, ChevronUp, Clock, Coffee, CornerDownRight,
  ExternalLink, Filter, Flag, Flame, Folder, GripVertical, Group, Inbox,
  Kanban, Layers, LayoutDashboard, Lightbulb, Link, List, LogOut, Mail, Menu,
  MessageSquare, MoreHorizontal, PanelLeft, PanelTop, Pencil, Plus, Repeat,
  Search, Settings, SlidersHorizontal, Star, Tag, Target, TrendingUp,
  TriangleAlert, Upload, X, Lock, Globe, ListChecks, Bold, Italic, Strikethrough, Heading1, Heading2, Quote, Code, ListOrdered,
  RotateCcw, Volume2, User, Eye, Sparkles, Info, Palette, Paperclip, SquareCheck, SmilePlus, Copy, Trash2, ArrowUp, FileText,
  type LucideIcon,
} from 'lucide-react';

/** Every glyph in the product, named exactly as it was under the old sprite. */
export type IconName =
  | 'sun' | 'sofa' | 'calendar-arrow-right' | 'calendar-x' | 'volume' | 'reset'
  | 'arrow-left' | 'arrow-right' | 'bars' | 'bell' | 'board' | 'calendar'
  | 'caret' | 'caret-up' | 'check' | 'clock' | 'close' | 'coffee' | 'comment'
  | 'dashboard' | 'deadline' | 'drag' | 'edit' | 'export' | 'external'
  | 'filter' | 'flag' | 'flame' | 'group' | 'inbox' | 'link' | 'list' | 'logout' | 'mail' | 'menu' | 'more'
  | 'plus' | 'project' | 'repeat' | 'search' | 'settings' | 'sidebar'
  | 'section' | 'sliders' | 'someday' | 'sort' | 'stack' | 'star' | 'subtask'
  | 'table' | 'tag' | 'tasks' | 'user' | 'eye' | 'sparkles' | 'info' | 'palette'
  | 'checkbox' | 'paperclip' | 'react' | 'copy' | 'trash' | 'arrow-up' | 'file' | 'image'
  | 'trend' | 'upcoming' | 'warning' | 'week' | 'lock' | 'globe'
  | 'bold' | 'italic' | 'strike' | 'heading1' | 'heading2' | 'quote' | 'code' | 'list-ordered';

/** Lucide (MIT, lucide.dev) — chosen to replace the app's hand-drawn sprite. */
const ICONS: Record<IconName, LucideIcon> = {
  sun: Sun, sofa: Sofa, 'calendar-arrow-right': Calendar, 'calendar-x': CalendarX, volume: Volume2,
  reset: RotateCcw,
  table: Table2,
  checkbox: SquareCheck, paperclip: Paperclip, react: SmilePlus, copy: Copy, trash: Trash2, 'arrow-up': ArrowUp, file: FileText, image: ImageGlyph,
  user: User, eye: Eye, sparkles: Sparkles, info: Info, palette: Palette, bold: Bold, italic: Italic, strike: Strikethrough, heading1: Heading1, heading2: Heading2, quote: Quote, code: Code, 'list-ordered': ListOrdered,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  bars: BarChart3,
  bell: Bell,
  board: Kanban,
  calendar: Calendar,
  caret: ChevronDown,
  'caret-up': ChevronUp,
  check: Check,
  clock: Clock,
  close: X,
  coffee: Coffee,
  comment: MessageSquare,
  dashboard: LayoutDashboard,
  deadline: Target,
  drag: GripVertical,
  edit: Pencil,
  export: Upload,
  external: ExternalLink,
  link: Link,
  mail: Mail,
  filter: Filter,
  flag: Flag,
  group: Group,
  inbox: Inbox,
  list: List,
  logout: LogOut,
  menu: Menu,
  more: MoreHorizontal,
  plus: Plus,
  project: Folder,
  repeat: Repeat,
  flame: Flame,
  search: Search,
  settings: Settings,
  sidebar: PanelLeft,
  section: PanelTop,
  sliders: SlidersHorizontal,
  someday: Lightbulb,
  sort: ArrowUpDown,
  stack: Layers,
  star: Star,
  subtask: CornerDownRight,
  tag: Tag,
  tasks: ListChecks,
  trend: TrendingUp,
  upcoming: CalendarClock,
  warning: TriangleAlert,
  lock: Lock,
  globe: Globe,
  week: CalendarDays,
};

interface IconProps {
  name: IconName;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Lets a caller tint a glyph, for project and tag markers. */
  style?: CSSProperties;
  title?: string;
}

export function Icon({ name, size = 'md', className, style, title }: IconProps) {
  const sizeClass = size === 'sm' ? ' ic-sm' : size === 'lg' ? ' ic-lg' : '';
  if (name === 'calendar-arrow-right') return <svg className={`ic${sizeClass}${className ? ` ${className}` : ''}`} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 2v4M8 2v4M3 10h18M11 22H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M14 18h8m-3-3 3 3-3 3" /></svg>;
  const Glyph = ICONS[name];
  return (
    <Glyph
      className={`ic${sizeClass}${className ? ` ${className}` : ''}`}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
    </Glyph>
  );
}

/* Lucide draws no brand marks. These three are Simple Icons' (CC0), filled in the text colour. */
const BRANDS = {
  github: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.063 2.063 0 1 1 0-4.127 2.063 2.063 0 0 1 0 4.127zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
} as const;

export function BrandIcon({ name }: { name: keyof typeof BRANDS }) {
  return (
    <svg className="ic ic-sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={BRANDS[name]} />
    </svg>
  );
}
