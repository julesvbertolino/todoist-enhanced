import { Icon } from './Icon';
import { useT } from '@/hooks/useT';
import { markerStyle } from '@/domain/colors';

/**
 * A picture of the Quick or Gathering dust group, under its toggle in Settings.
 *
 * The same markup as the real list (group head, count and time pill, rows), so
 * it follows the theme, the accent, the chips and the density; the tasks are
 * illustrative. It is shown whatever the toggle says: it explains the setting,
 * and nothing in it can be clicked or focused.
 */
export function GroupPreview({ kind }: { kind: 'quick' | 'dust' }) {
  const { t } = useT();
  const rows = kind === 'quick'
    ? [
        { title: t('preview.task.meeting'), project: 'Website', color: 'blue', est: '5 min' },
        { title: t('preview.task.invoice'), project: 'Admin', color: 'green', est: '3 min' },
      ]
    : [
        { title: t('preview.task.dustGuitar'), project: 'Perso', color: 'orange', age: 10 },
        { title: t('preview.task.dustAlbum'), project: 'Perso', color: 'orange', age: 7 },
      ];
  const total = kind === 'quick' ? '8 min' : '3 h';

  return (
    <div className="grouppreview" aria-hidden="true">
      <div className="mode">
        <section className={`group accent-${kind}`}>
          <div className="gheadblock">
            <div className="ghead">
              <span className="gcaret"><Icon name="caret" size="sm" /></span>
              <span className="gtoggle">
                <span className="gname">{t(kind === 'quick' ? 'group.quick' : 'group.dust')}</span>
                {kind === 'dust' && <span className="gsub">{t('group.dustSince', { count: 3 })}</span>}
                <span className="gstats">
                  <span className="gcount">{t('metrics.tasks', { count: rows.length })}</span>
                  <span className="gtime">{total}</span>
                </span>
              </span>
            </div>
          </div>
          {rows.map((row) => (
            <div className="taskwrap" key={row.title}>
              <div className="task" {...(kind === 'dust' ? { 'data-dust': '' } : {})}>
                <span className="check p4" />
                <span className="tmain">
                  <span className="ttitle">{row.title}</span>
                  <span className="meta">
                    {'est' in row && <span className="est"><Icon name="clock" />{row.est}</span>}
                    <span className="proj" style={markerStyle(row.color)}>#{row.project}</span>
                    {'age' in row && <span className="dustage">{t('dust.age', { count: row.age })}</span>}
                  </span>
                </span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
