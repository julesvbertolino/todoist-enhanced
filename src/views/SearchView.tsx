import { useMemo } from 'react';
import { useData } from '@/hooks/useData';
import { useT } from '@/hooks/useT';
import { navigate } from '@/hooks/useRoute';
import { useStore } from '@/store/store';
import { searchRank } from '@/domain/search';
import { markerStyle } from '@/domain/colors';
import { readProjectIcon } from '@/domain/projectIcons';
import { Icon } from '@/components/Icon';
import { ProjectIcon } from '@/components/ProjectIconPicker';
import { TaskGroup } from '@/components/TaskGroup';
import { SubtasksProvider } from '@/components/TaskRow';
import { PageHeader } from '@/components/PageHeader';
import { summariseLoad } from '@/domain/load';
export function SearchView({ query, onOpen }: { query: string; onOpen: (id: string) => void }) {
  const { t } = useT();
  const { snapshot, items, childrenOf } = useData();
  const sections = useStore((s) => s.prefs.includeSectionsInSearch);
  const matches = useMemo(() => items.map((item, order) => ({ item, order, rank: searchRank(query, item.content, item.description) }))
    .filter((hit) => hit.rank >= 0).sort((a, b) => a.rank - b.rank || a.order - b.order).map((hit) => hit.item), [items, query]);
  const links = [
    ...Object.values(snapshot.projects).filter((p) => !p.is_archived && !p.is_deleted)
      .map((p) => {
        const icon = readProjectIcon(p.description);
        return { key: `p${p.id}`, title: p.name, color: p.color, glyph: p.inbox_project ? <Icon name="inbox" size="sm" /> : icon ? <ProjectIcon iconId={icon} size="sm" /> : <span className="hash">#</span>, rank: searchRank(query, p.name), run: () => navigate('project', p.id) };
      }),
    ...(sections ? Object.values(snapshot.sections).filter((s) => !s.is_archived && !s.is_deleted && snapshot.projects[s.project_id] && !snapshot.projects[s.project_id].is_archived && !snapshot.projects[s.project_id].is_deleted)
      .map((s) => ({ key: `s${s.id}`, title: `${s.name} · ${snapshot.projects[s.project_id].name}`, color: snapshot.projects[s.project_id].color, glyph: <Icon name="section" size="sm" />, rank: searchRank(query, s.name), run: () => navigate('project', s.project_id, { sectionId: s.id }) })) : []),
    ...Object.values(snapshot.labels).filter((l) => !l.is_deleted && !l.name.startsWith('est-'))
      .map((l) => ({ key: `l${l.id}`, title: l.name, color: l.color, glyph: <Icon name="tag" size="sm" />, rank: searchRank(query, l.name), run: () => navigate('label', l.name) })),
  ].filter((hit) => hit.rank >= 0).sort((a, b) => a.rank - b.rank);
  return <div className="page search-page">
    <PageHeader title={t('search.resultsTitle', { query })} load={summariseLoad(matches, childrenOf, null)} hireNote={false} />
    <div className="mode">
      {links.length > 0 && <nav className="search-destinations" aria-label={t('search.places')}>{links.map((hit) => <button className="search-place" style={markerStyle(hit.color)} key={hit.key} onClick={hit.run}>{hit.glyph}<span>{hit.title}</span></button>)}</nav>}
      <SubtasksProvider value={false}><TaskGroup items={matches} childrenOf={childrenOf} onOpen={onOpen} draggable={false} /></SubtasksProvider>
    </div>
    {matches.length === 0 && <p className="empty">{t('search.noResults')}</p>}
  </div>;
}
