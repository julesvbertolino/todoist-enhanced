import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { useT } from '@/hooks/useT';
import { useStore } from '@/store/store';
import { markerStyle } from '@/domain/colors';
import { visibleDetailChips, type DetailChip } from '@/domain/taskDetails';
import { visibleSidebarNav, type SidebarItemId } from '@/domain/sidebar';
import { ENTRY } from './SidebarNavEditor';

/** The numbers the picture's sidebar shows beside its entries. */
const PREVIEW_COUNT: Partial<Record<SidebarItemId, string>> = {
  inbox: '3', today: '5', week: '14', upcoming: '4', someday: '3',
};

/** What a preview is about, so it shows only what the choice beside it changes. */
export type PreviewStage = 'appearance' | 'accent' | 'density' | 'organisation' | 'metadata' | 'login';

/** The window the picture is drawn in, before it is scaled down to the room it has. */
const WINDOW_W = 1280;
const WINDOW_H = 700;

/**
 * A picture of the workspace that follows the choices made beside it.
 *
 * It is the app's own markup, drawn once at the size of a laptop window and
 * scaled down, so the sidebar, the columns, the chips, the colour, the layout,
 * the background and the density in it are the ones the real page wears; the
 * tasks are illustrative and are not a second task store, and nothing in it
 * can be clicked, focused or changed (#177, #178). The Quick Tasks column is
 * blue whatever the accent is, Eisenhower is only ever a destination in the
 * sidebar, and a split week gets its own Today.
 */
export function WorkspacePreview({ stage, layout = 'inline' }: {
  stage: PreviewStage;
  /** `inline` sits between settings; `stage` fills the room a setup step gives it. */
  layout?: 'inline' | 'stage';
}) {
  const { t } = useT();
  const density = useStore((s) => s.prefs.density);
  const weekLayout = useStore((s) => s.prefs.weekLayout);
  const eisenhower = useStore((s) => s.prefs.eisenhowerEnabled);
  const quick = useStore((s) => s.prefs.showQuickGroup);
  const counts = useStore((s) => s.prefs.sidebarCounts);
  const search = useStore((s) => s.prefs.sidebarSearch);
  const nav = useStore((s) => s.prefs.sidebarNav);
  const split = weekLayout === 'split';
  const visible = visibleSidebarNav(nav, { splitToday: split, matrix: eisenhower });

  /* In a setup step the picture is the point of the step, so it is drawn closer
     (a narrower window, scaled up) and cropped: the sidebar, or the list, in
     a size you can aim at. */
  const zoomed = layout === 'stage' && (stage === 'metadata' || stage === 'organisation');
  const windowW = zoomed ? (stage === 'metadata' ? 760 : 620) : stage === 'login' ? 1100 : WINDOW_W;
  const windowH = zoomed ? 560 : stage === 'login' ? 820 : WINDOW_H;

  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useLayoutEffect(() => {
    const node = frame.current;
    if (!node) return;
    const measure = () => setScale(Math.max(0.2, node.clientWidth / windowW));
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(node);
    return () => watch.disconnect();
  }, [windowW]);

  return (
    <aside
      className={`polish-preview pvframe ${layout === 'stage' ? 'preview-stage-fill' : 'preview-inline'}`}
      data-density={density}
      data-stage={stage}
      role="img"
      aria-label={t('preview.title')}
    >
      <div className="pvwrap" ref={frame} style={{ height: windowH * scale }} aria-hidden="true">
        <div
          className="pvscale"
          style={{ width: windowW, height: windowH, transform: `scale(${scale})` } as CSSProperties}
        >
          <div className="app">
            <aside className="sidebar">
              <div className="side-top">
                <span className="profile">
                  <span className="avatar"><b>RH</b></span>
                  <span className="identity">
                    <strong>{t('preview.person')}</strong>
                    <span className="karma"><small>{t('preview.rank')}</small><span className="karmabar"><i style={{ width: '42%' }} /></span></span>
                  </span>
                </span>
                <span className="iconbtn"><Icon name="bell" /></span>
                <span className="iconbtn"><Icon name="sidebar" /></span>
              </div>
              <div className="side-scroll">
                {search && (
                  <span className="searchbtn"><Icon name="search" /><span>{t('nav.search')}</span><kbd>⌘K</kbd></span>
                )}
                {visible.main.map((id) => (
                  <PreviewNav
                    key={id} icon={ENTRY[id].icon} label={t(ENTRY[id].label)}
                    count={counts ? PREVIEW_COUNT[id] : undefined} current={id === 'week'}
                  />
                ))}
                {visible.main.length > 0 && visible.other.length > 0 && <div className="nav-gap" />}
                {visible.other.map((id) => (
                  <PreviewNav key={id} icon={ENTRY[id].icon} label={t(ENTRY[id].label)} />
                ))}
                <div className="side-head"><span>{t('nav.favourites')}</span></div>
                <PreviewProject name="Work" count={counts ? '3' : undefined} />
                <PreviewProject name="Home" count={counts ? '1' : undefined} />
                <div className="side-head"><span>{t('nav.myProjects')}</span></div>
                <PreviewProject name="Work" count={counts ? '3' : undefined} />
              </div>
              <div className="side-foot">
                <span className="addbtn"><Icon name="plus" />{t('nav.addTask')}</span>
              </div>
            </aside>
            <div className="workspace">
              <div className="page">
                <div className="phead">
                  <div className="phead-text"><h1 className="ptitle">{t('nav.week')}</h1></div>
                  <div className="pactions">
                    <span className="btn"><Icon name="sliders" />{t('toolbar.display')}</span>
                    <span className="btn accent"><Icon name="trend" />{t('insights.title')}</span>
                  </div>
                </div>
                <div className="metrics">{t('preview.summary')}</div>
                {stage === 'metadata' || stage === 'login' ? <PreviewList /> : (
                <div className="mode">
                  <div className="board fullwidth">
                    <div>
                      <section className="col accent-late">
                        <PreviewHead title={t('group.overdue')} count={1} />
                        <PreviewCard title={t('preview.task.homepage')} minutes="45 min" late />
                      </section>
                    </div>
                    {quick && (
                      <div>
                        <section className="col accent-quick preview-callout">
                          <PreviewHead title={t('group.quick')} count={2} />
                          <PreviewCard title={t('preview.task.proposal')} minutes="5 min" />
                          <PreviewCard title={t('preview.task.meeting')} minutes="3 min" />
                        </section>
                      </div>
                    )}
                    <div>
                      <section className="col">
                        <PreviewHead title={split ? t('group.anytime') : t('common.today')} count={2} />
                        <PreviewCard title={t('preview.task.invoice')} minutes="10 min" />
                        <PreviewCard
                          title={t('preview.task.rebuild')} minutes="2 h"
                          sub={t('preview.task.images')}
                        />
                      </section>
                    </div>
                  </div>
                </div>
                )}
              </div>
              {stage === 'accent' && (
                <div className="pvscrim">
                  <div className="preview-composer">
                    <strong>{t('preview.task.homepage')}</strong>
                    <p>{t('preview.composer.desc')}</p>
                    <div className="meta">
                      <span className="at"><Icon name="calendar" size="sm" />{t('common.today')}</span>
                      <span className="proj" style={markerStyle('blue')}># Website</span>
                    </div>
                    <footer>
                      <span>{t('common.cancel')}</span>
                      <span className="preview-primary">{t('composer.add')}</span>
                    </footer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function PreviewNav({ icon, label, count, current }: {
  icon: IconName; label: string; count?: string; current?: boolean;
}) {
  return (
    <span className="navitem preview-nav" aria-current={current ? 'page' : undefined}>
      <Icon name={icon} />
      <span className="label">{label}</span>
      {count && <span className="count">{count}</span>}
    </span>
  );
}

function PreviewProject({ name, count }: { name: string; count?: string }) {
  return (
    <span className="navitem preview-nav">
      <span className="hash" style={markerStyle('orange')}>#</span>
      <span className="label">{name}</span>
      {count && <span className="count">{count}</span>}
    </span>
  );
}

function PreviewHead({ title, count }: { title: string; count: number }) {
  const { t } = useT();
  return (
    <>
      <div className="chead">
        <div className="chead-title">
          <strong>{title}</strong>
          <small>{t('metrics.tasks', { count })}</small>
        </div>
      </div>
    </>
  );
}

function PreviewCard({ title, minutes, sub, late }: {
  title: string; minutes: string; sub?: string; late?: boolean;
}) {
  const { t } = useT();
  return (
    <div className="taskwrap">
      <div className="task preview-task">
        <span className={`check ${late ? 'p1' : 'p4'}`} />
        <span className="tmain">
          <span className="ttitle">{title}</span>
          <span className="meta">
            <span className="est"><Icon name="clock" size="sm" />{minutes}</span>
            <span className={late ? 'late' : 'at'}><Icon name="calendar" size="sm" />{late ? t('preview.yesterday') : t('common.today')}</span>
            <span className="proj" style={markerStyle('blue')}># Website</span>
          </span>
        </span>
      </div>
      {sub && (
        <div className="task preview-task" data-depth="1">
          <span className="check p4" />
          <span className="tmain"><span className="ttitle">{sub}</span></span>
        </div>
      )}
    </div>
  );
}

/**
 * The list a task row is drawn in, from the user's own choices: what a row
 * shows (taskFields), in what order (detailOrder), in which style (the page
 * carries it as data-chips). Illustrative, like the rest of the preview.
 */
function PreviewList() {
  const { t } = useT();
  const quick = useStore((s) => s.prefs.showQuickGroup);
  const fields = useStore((s) => s.prefs.taskFields);
  const order = useStore((s) => s.prefs.detailOrder);
  const chips = visibleDetailChips(order, fields);

  const chip = (kind: DetailChip, row: PreviewRowData): ReactNode => {
    switch (kind) {
      case 'estimate':
        return row.minutes && <span className="est" key={kind}><Icon name="clock" size="sm" />{row.minutes}</span>;
      case 'date':
        return <span className={row.late ? 'late' : 'at'} key={kind}>
          <Icon name="calendar" size="sm" />{row.late ? t('preview.yesterday') : t('common.today')}
        </span>;
      case 'deadline':
        return row.deadline && <span className="deadline" key={kind}><Icon name="deadline" />{row.deadline}</span>;
      case 'labels':
        return row.label && <span className="tag" key={kind} style={markerStyle('green')}><Icon name="tag" size="sm" />{row.label}</span>;
      case 'project':
        return <span className="proj" key={kind} style={markerStyle('blue')}># Website</span>;
    }
  };

  const rows: Array<{ group: string; accent?: string; items: PreviewRowData[] }> = [
    { group: t('group.overdue'), accent: 'late', items: [
      { title: t('preview.task.homepage'), desc: t('preview.task.homepageDesc'), minutes: '45 min', late: true, deadline: 'Fri 17 Oct', label: 'waiting', priority: 1 },
    ] },
    ...(quick ? [{ group: t('group.quick'), accent: 'quick', items: [
      { title: t('preview.task.proposal'), desc: t('preview.task.proposalDesc'), minutes: '3 min', label: 'quick', priority: 2 as const },
      { title: t('preview.task.meeting'), minutes: '5 min', priority: 4 as const },
    ] }] : []),
    { group: t('common.today'), items: [
      { title: t('preview.task.rebuild'), desc: t('preview.task.rebuildDesc'), minutes: '2 h', priority: 3 },
    ] },
  ];

  return (
    <div className="mode preview-list">
      {rows.map((section) => (
        <section className={`group${section.accent ? ` accent-${section.accent}` : ''}`} key={section.group}>
          <div className="ghead">
            <span className="gname">{section.group}</span>
            <span className="gcount">{t('metrics.tasks', { count: section.items.length })}</span>
          </div>
          {section.items.map((row) => (
            <div className="task preview-task" key={row.title}>
              <span className={`check ${fields.priority ? `p${row.priority ?? 4}` : 'p4'}`} />
              <span className="tmain">
                <span className="ttitle">{row.title}</span>
                {fields.description && row.desc && <span className="tdesc">{row.desc}</span>}
                <span className="meta">{chips.map((kind) => chip(kind, row))}</span>
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

interface PreviewRowData {
  title: string;
  desc?: string;
  minutes?: string;
  late?: boolean;
  deadline?: string;
  label?: string;
  priority?: 1 | 2 | 3 | 4;
}
