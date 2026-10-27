import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';
import type { ChangelogVisual } from '@/domain/changelogVisuals';
import './changelog-preview.css';

const PAD = 15;

/**
 * Every picture sits in the same 5:2 frame, the one of the subtasks card, and
 * its content is scaled to fill it: never a small drawing lost in a big white
 * card, never a tall one that pushes its entry open.
 */
function Fit({ kind, children }: { kind: string; children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = frame.current, content = inner.current;
    if (!box || !content) return;
    const fit = () => {
      const width = box.clientWidth - 2 * PAD, room = box.clientHeight - 2 * PAD;
      if (width <= 0 || room <= 0) return;
      let scale = 1, height = 0;
      for (let pass = 0; pass < 4; pass += 1) {
        content.style.width = `${width / scale}px`;
        height = content.scrollHeight;
        scale = Math.min(1.6, Math.max(0.55, room / height));
      }
      content.style.width = `${width / scale}px`;
      height = content.scrollHeight;
      content.style.transform = `scale(${scale})`;
      content.style.top = `${PAD + Math.max(0, (room - height * scale) / 2)}px`;
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(box);
    return () => watch.disconnect();
  }, [kind]);
  return <div className={`changelog-preview cv-kind-${kind}`} data-changelog-preview={kind} aria-hidden="true" ref={frame}>
    <div className="cv-fit" ref={inner}>{children}</div>
  </div>;
}

/**
 * Illustrative, offline UI examples. No live task data or interactive controls.
 * The pictures are always in English, whatever language the text around them is in.
 */
export function ChangelogPreview({ kind }: { kind: ChangelogVisual | null }) {
  const say = (en: string, _french?: string) => en;
  const chip = (text: string, tone = '') => <span className={`cv-chip ${tone}`}>{text}</span>;
  const row = (text: string, icon: IconName = 'checkbox', end?: ReactNode, selected = false) => <div className={`cv-row${selected ? ' selected' : ''}`}><Icon name={icon} size="sm" /><span>{text}</span>{end && <small>{end}</small>}</div>;
  const title = (text: string) => <strong className="cv-title">{text}</strong>;
  const task = say('Prepare the presentation', 'Préparer la présentation');
  const review = say('Review the copy', 'Relire les textes');
  const design = say('Website', 'Site vitrine');
  const durations = <div className="cv-chips">{['15 min', '30 min', '1 h', '1 h 30'].map((d) => <span key={d} className={`cv-chip${d === '30 min' ? ' accent' : ''}`}>{d}</span>)}</div>;
  const bars = <div className="cv-bars">{[38, 65, 45, 83, 54, 22, 15].map((height, i) => <i key={i} style={{ height: `${height}%` }} />)}</div>;
  const people = <>{row(say('You', 'Vous'), 'user', say('Owner', 'Propriétaire'))}{row('Anne', 'user', say('Collaborator', 'Collaboratrice'))}{row(say('Invite by email', 'Inviter par e-mail'), 'plus')}</>;
  const parsed = <>{title(say('Add task', 'Ajouter une tâche'))}<div className="cv-sentence">{say('Call the client', 'Appeler le client')} {chip(say('tomorrow 9am', 'demain à 9h'), 'accent')} {chip('p1', 'red')} {chip('@design', 'purple')}</div><div className="cv-chips">{chip(say('Tomorrow · 09:00', 'Demain · 09:00'))}{chip('P1', 'red')}</div></>;
  let content: ReactNode;
  switch (kind) {
    case null: return null;
    case 'darkAmoled':
      content = <div className="cv-amoled">{[['Classic', ''], ['AMOLED', ' black']].map(([label, tone]) => <div key={label} className={`cv-amoled-screen${tone}`}>
        <aside><i /><i /><i /></aside><main><b>{label}</b>{row(review, 'checkbox')}{row(task, 'checkbox')}<span className="cv-amoled-menu">Menu</span></main></div>)}</div>; break;
    case 'nlpShorthands':
      content = <>{title(say('Add task', 'Ajouter une tâche'))}<div className="cv-field">Pay the invoice <span className="cv-typed">tmr</span></div><div className="cv-chips">{chip(say('Tomorrow', 'Demain'), 'accent')}{chip(say('Priority', 'Priorité'))}{chip('Inbox')}{chip(say('Add task', 'Ajouter une tâche'), 'accent')}</div></>; break;
    case 'threadOrder':
      content = <><div className="cv-order">{chip(say('Newest first', 'Plus récents d’abord'), 'accent')}</div>{[['Anne', 'Sounds good, shipping it today.', '14:20'], ['You', 'Final copy is attached.', '11:05'], ['Anne', 'Can you send the final copy?', 'Yesterday']].map(([who, text, when]) => <div className="cv-comment" key={text}><Icon name="user" size="sm" /><span><b>{who}</b> <small>{when}</small><br />{text}</span></div>)}</>; break;
    case 'taskComments':
      content = <>{title('Website')}{row('Prepare the presentation', 'checkbox', <span className="cv-comment-count"><Icon name="comment" size="sm" />3</span>)}{row('Review the copy', 'checkbox', <span className="cv-comment-count"><Icon name="comment" size="sm" />1</span>)}{row('Publish the page', 'checkbox')}</>; break;
    case 'boardDestination':
      content = <div className="cv-destination-board">{['To do', 'In progress', 'Done'].map((name, i) => <section key={name} className={i === 1 ? 'destination' : ''}><strong>{name}</strong>{i !== 2 && <div className="cv-board-card"><Icon name="checkbox" size="sm" />{i === 0 ? 'Review the copy' : 'Prepare the presentation'}</div>}{i === 1 && <div className="cv-board-card floating"><Icon name="checkbox" size="sm" />Publish the page</div>}</section>)}</div>; break;
    case 'taskQuickActions':
      content = <div className="cv-quick-menu">
        <div className="task-quick-label">Start date</div>
        <div className="cv-quick-dates">{(['sun', 'sofa', 'calendar-arrow-right', 'reset', 'calendar-x', 'calendar'] as IconName[]).map((icon) => <span key={icon}><Icon name={icon} /></span>)}</div>
        <hr />{row('Deadline', 'deadline')}<hr />
        <div className="task-quick-label">Priorities</div>
        <div className="cv-quick-priorities">{[1, 2, 3, 4].map((p) => <span key={p} className={p === 2 ? 'selected' : ''} style={{ color: `var(--p${p})` }}><Icon name="flag" size="sm" />P{p}</span>)}</div>
      </div>; break;
    case 'calendar':
      content = <div className="cv-cal">
        <div className="cv-cal-days">{['MON', 'TUE', 'WED'].map((day, i) => <span key={day}>{day}<b>{12 + i}</b></span>)}</div>
        <div className="cv-cal-grid">
          <div><span className="cv-event purple">Plan the week<small>09:00 · 30 min</small></span></div>
          <div><span className="cv-event blue">Move the project forward<small>09:30 · 1 h</small></span></div>
          <div><span className="cv-event orange">Time for yourself<small>10:00 · 45 min</small></span></div>
        </div>
      </div>; break;
    case 'assign':
      content = <><div className="cv-sentence">Prepare the presentation {chip('+Anne', 'accent')}</div>{row('Anne', 'user', '↵', true)}</>; break;
    case 'views':
      content = <><div className="cv-heading"><Icon name="project" size="sm" />{design}</div>
        <div className="cv-pills">{([['list', 'Main view', true], ['board', 'By status'], ['table', 'Overview']] as Array<[IconName, string, boolean?]>).map(([icon, label, on]) =>
          <span key={label} className={`cv-pill${on ? ' on' : ''}`}><Icon name={icon} size="sm" />{label}</span>)}<span className="cv-pill plus">+</span></div>
        {row(review, 'checkbox', 'P1')}{row(task, 'checkbox', 'P2')}</>; break;
    case 'mentions':
      content = <>{title(say('Comments', 'Commentaires'))}<div className="cv-chips">{chip(say('Notify: Anne', 'Notifier : Anne'))}</div><div className="cv-field">{say('Can you check the copy, ', 'Tu peux relire les textes, ')}<span className="cv-chip accent">@Anne</span> ?</div>{row('Anne', 'user', undefined, true)}{row('Sam', 'user')}</>; break;
    case 'subtasks':
      content = <>{row('Prepare the brief tomorrow at 9am', 'checkbox', '9:00')}{row('Review the copy p1', 'checkbox', 'P1')}{row('Choose photos for 30 min', 'checkbox', '30 min')}</>; break;
    case 'composerImage':
      content = <>{title(say('Add task', 'Ajouter une tâche'))}<div className="cv-field">{say('Review the mockup', 'Relire la maquette')}</div>
        <div className="cv-image-attachment"><span className="cv-image-thumbnail"><Icon name="image" /></span><span>{say('Screenshot.png', 'Capture.png')}<small>{say('Image attached', 'Image jointe')}</small></span><Icon name="close" size="sm" /></div>
        <div className="cv-chips">{chip(say('Today', 'Aujourd’hui'), 'green')}{chip(say('Add task', 'Ajouter une tâche'), 'accent')}</div>
        <div className="cv-footnote">{say('Paste an image · Preview · Add it as a comment', 'Coller une image · Vérifier l’aperçu · Joindre en commentaire')}</div></>; break;
    case 'viewChoices':
      content = <div className="cv-modes">{([['list', say('List', 'Liste'), false], ['board', say('Board', 'Tableau'), false], ['table', 'Table', true], ['calendar', say('Calendar', 'Calendrier'), false]] as Array<[IconName, string, boolean]>)
        .map(([icon, label, on]) => <span key={label} className={on ? 'on' : ''}><Icon name={icon} size="sm" /><small>{label}</small></span>)}</div>; break;
    case 'table':
      content = <>{title(say('Table view', 'Vue Table'))}<div className="cv-task-table">
        <div className="cv-table-heading"><b>{say('Task', 'Tâche')}</b><b>{say('Date', 'Date')} ↑</b><b>{say('Priority', 'Priorité')}</b></div>
        <div><span><Icon name="checkbox" size="sm" />{review}</span>{chip(say('Today', 'Aujourd’hui'), 'green')}{chip('P1', 'red')}</div>
        <div><span><Icon name="checkbox" size="sm" />{say('Choose photos', 'Choisir les photos')}</span>{chip(say('Tomorrow', 'Demain'), 'orange')}{chip('P2', 'orange')}</div>
        <div><span><Icon name="checkbox" size="sm" />{say('Publish the page', 'Publier la page')}</span>{chip(say('Friday', 'Vendredi'), 'purple')}{chip('P3', 'blue')}</div>
      </div><div className="cv-footnote">{say('Choose columns · Sort · Edit in place', 'Choisir les colonnes · Trier · Modifier sur place')}</div></>; break;
    case 'sidebarResize':
      content = <>{title(say('Room for longer project names', 'De la place pour les noms de projets'))}<div className="cv-resize-window">
        <div className="cv-resize-sidebar">{row(say('My week', 'Cette semaine'), 'week')}{row(say('Organise the client workshop', 'Organiser l’atelier client'), 'project', undefined, true)}{row(say('Website redesign', 'Refonte du site internet'), 'project')}</div>
        <span className="cv-resize-edge"><Icon name="arrow-left" size="sm" /><Icon name="arrow-right" size="sm" /></span>
        <div className="cv-resize-page"><i /><i /><i /></div>
      </div><div className="cv-footnote">{say('Drag the edge · Double-click to reset', 'Glisser le bord · Double-cliquer pour réinitialiser')}</div></>; break;
    case 'sidebarFilters':
      content = <div className="cv-sidebar">{row(say('My week', 'Cette semaine'), 'week', '12')}{row(say('Filters', 'Filtres'), 'filter', undefined, true)}<div className="cv-section">{say('Favourites', 'Favoris')}</div>{row(say('Quick wins', 'Tâches rapides'), 'filter', '4')}{row(say('Important this week', 'Important cette semaine'), 'filter', '8')}</div>; break;
    case 'filterEditor':
      content = <>{title(say('New filter', 'Nouveau filtre'))}<div className="cv-field">{say('Important this week', 'Important cette semaine')}</div><div className="cv-field code">7 days &amp; p1</div><div className="cv-chips">{chip(say('Colour', 'Couleur'), 'purple')}{chip(say('Favourite ★', 'Favori ★'), 'accent')}</div></>; break;
    case 'favourites':
      content = <>{title(say('Favourites', 'Favoris'))}{row(say('Quick wins', 'Tâches rapides'), 'filter', <span className="cv-star">★</span>)}{row('Design', 'tag', <span className="cv-star">★</span>)}</>; break;
    case 'tags': case 'tagColours': case 'bulkTags':
      content = <>{title(say('Tags', 'Tags'))}{row('Design', 'tag', chip(kind === 'bulkTags' ? '✓' : '12', 'purple'))}{row(say('Waiting', 'En attente'), 'tag', chip(kind === 'bulkTags' ? '−' : '4', 'orange'))}<div className="cv-swatches">{['#7e57c2', '#36a37b', '#e99835', '#e35b65', '#4188d3'].map((color) => <i key={color} style={{ background: color }} />)}</div></>; break;
    case 'sharing': case 'access':
      content = <>{title(say('Share project', 'Partager le projet'))}{kind === 'access' ? <>{row(say('Restricted', 'Restreint'), 'lock', '✓', true)}{row(say('Team', 'Équipe'), 'group')}{row(say('Public', 'Public'), 'globe')}</> : people}</>; break;
    case 'assigneeFilter':
      content = <>{title(say('Assigned to', 'Assigné à'))}{row(say('Me & unassigned', 'Moi et non assignées'), 'user', '✓', true)}{row('Anne', 'user')}{row(say('Everyone', 'Tout le monde'), 'group')}</>; break;
    case 'workspacePage':
      content = <><b className="cv-title">{say('My projects', 'Mes projets')}</b><div className="cv-workspace-head"><span>{say('Project', 'Projet')}</span><span>{say('Open', 'Ouvertes')}</span><span>{say('Done', 'Achevées')}</span><span>{say('Progress', 'Progrès')}</span></div>{[[say('Website', 'Site web'), 8, 12, 60], [say('Home', 'Maison'), 4, 16, 80]].map(([name, open, done, progress]) => <div className="cv-workspace-row" key={name}><span>{name}</span><span>{open}</span><span>{done}</span><span><i style={{ width: `${progress}%` }} />{progress}%</span></div>)}<div className="cv-section">{say('Archive', 'Archives')}</div></>; break;
    case 'workspaces':
      content = <>{title(say('Workspaces', 'Espaces de travail'))}{row(say('My projects', 'Mes projets'), 'project', '✓', true)}{row('Studio', 'group', '✓', true)}<div className="cv-indent">{row(design, 'project', '8')}{row(say('Brand identity', 'Identité visuelle'), 'project', '5')}</div></>; break;
    case 'forecast': case 'skipRepeat':
      content = <>{title(say('Upcoming', 'Prochainement'))}{row(say('Daily check', 'Point quotidien'), 'repeat', chip(say('Today', 'Aujourd’hui'), 'accent'))}<div className="cv-forecast">{row(say('Daily check', 'Point quotidien'), 'repeat', say('Tomorrow', 'Demain'))}{row(say('Daily check', 'Point quotidien'), 'repeat', say('Friday', 'Vendredi'))}</div>{kind === 'skipRepeat' && <div className="cv-footnote">↪ {say('Skip to next occurrence', 'Passer à l’occurrence suivante')}</div>}</>; break;
    case 'search': case 'searchSections':
      content = <><div className="cv-field cv-search"><Icon name="search" size="sm" />{say('design', 'maquette')}<kbd>⌘K</kbd></div>{row(say('Review the design', 'Relire la maquette'), 'checkbox', '↵', true)}{row(design, 'project')}{row(say('In review', 'À relire'), 'section')}<div className="cv-footnote">{say('See all results', 'Voir tous les résultats')} →</div></>; break;
    case 'parser': case 'rejectParser': content = parsed; break;
    case 'duration': case 'estimates': case 'bulkEstimate':
      content = <>{title(say(kind === 'bulkEstimate' ? 'Estimate selected tasks' : 'Estimated time', kind === 'bulkEstimate' ? 'Estimer la sélection' : 'Durée estimée'))}{durations}<div className="cv-field">{kind === 'duration' ? say('for one hour thirty', 'pendant une heure trente') : '30 min'}<span className="cv-success">↵</span></div>{kind === 'duration' && <div className="cv-footnote">→ 1 h 30</div>}</>; break;
    case 'estimateStorage': case 'estimateConversion':
      content = <>{title(say('Store estimates', 'Enregistrer les estimations'))}{row(say('As labels', 'En étiquettes'), 'tag', chip('est-30', 'accent'), true)}{row(say('As Todoist durations', 'En durées Todoist'), 'clock', '30 min')}{kind === 'estimateConversion' && <div className="cv-footnote">30 min → est-30 · {say('Preview before converting', 'Aperçu avant conversion')}</div>}</>; break;
    case 'metadata':
      content = <>{row(task, 'checkbox')}<div className="cv-indent cv-chips">{chip(say('Tomorrow', 'Demain'), 'orange')}{chip(design, 'blue')}{chip('@design', 'purple')}{chip('45 min')}</div><div className="cv-footnote">{say('Date · Project · Tags · Estimate', 'Date · Projet · Tags · Estimation')}</div></>; break;
    case 'datePicker':
      content = <>{title(say('Schedule', 'Planifier'))}<div className="cv-field">{say('Every Monday at 9am', 'Chaque lundi à 9h')}</div><div className="cv-chips">{chip('09:00', 'accent')}{chip('30 min')}{chip(say('Repeat ↻', 'Répéter ↻'), 'purple')}</div><div className="cv-date-grid">{Array.from({ length: 14 }, (_, i) => <span key={i} className={i === 7 ? 'on' : ''}>{i + 8}</span>)}</div></>; break;
    case 'projectView':
      content = <>{title(say('Default view', 'Vue par défaut'))}{row(say('List', 'Liste'), 'list', '✓', true)}{row(say('Board', 'Tableau'), 'board')}<div className="cv-footnote">{design}</div></>; break;
    case 'board': case 'boardSection': case 'layouts':
      content = <><div className="cv-board">{[say('To do', 'À faire'), say('In progress', 'En cours'), kind === 'boardSection' ? '+ ' + say('Add section', 'Ajouter une section') : say('Done', 'Terminé')].map((label, i) => <div key={label}><b>{label}</b>{(kind !== 'boardSection' || i !== 2) && <><p>{[task, review, say('Publish', 'Publier')][i]}</p><small>{[30, 45, 15][i]} min</small></>}</div>)}</div></>; break;
    case 'sidebar': case 'projectNesting': case 'mobileBrowse': case 'today':
      content = <div className="cv-sidebar">{title(kind === 'mobileBrowse' ? say('Browse', 'Parcourir') : say('Your sidebar', 'Votre barre latérale'))}{kind === 'today' && row(say('Today', 'Aujourd’hui'), 'calendar', '5', true)}{row(say('My week', 'Cette semaine'), 'week', '12')}{row(say('Filters', 'Filtres'), 'filter')}{row(design, 'project', '8')}<div className="cv-indent">{row(say('Content', 'Contenus'), 'project', '3')}</div></div>; break;
    case 'appearance': case 'dark': case 'accent': case 'setup':
      content = <>{title(say('Your workspace, your style', 'Votre espace, votre style'))}<div className="cv-appearances"><div><i /><span /><span /><span /></div><div className="dark"><i /><span /><span /><span /></div></div><div className="cv-swatches">{['#dd4b39', '#dca039', '#418e76', '#4486bd', '#7a5ac6'].map((color) => <i key={color} style={{ background: color }} />)}</div></>; break;
    case 'notifications':
      content = <>{title(say('Notifications', 'Notifications'))}{row(say('Project invitation', 'Invitation à un projet'), 'bell')}<div className="cv-chips">{chip(say('Accept', 'Accepter'), 'accent')}{chip(say('Decline', 'Refuser'))}</div>{row(say('Estimates to settle', 'Estimations à régler'), 'warning', '3')}</>; break;
    case 'projectPicker': case 'projectMenu': case 'sectionMenu':
      content = <>{title(kind === 'sectionMenu' ? say('Section actions', 'Actions de la section') : design)}{kind === 'projectPicker' ? <><div className="cv-field">#Website / {say('In review', 'À relire')}</div>{row(say('In review', 'À relire'), 'section', '↵', true)}{row(say('New project…', 'Nouveau projet…'), 'plus')}</> : <>{row(say('Rename', 'Renommer'), 'edit')}{row(say('Move', 'Déplacer'), 'project')}{row(say('Duplicate', 'Dupliquer'), 'copy')}{row(say('Archive', 'Archiver'), 'inbox')}</>}</>; break;
    case 'taskNavigation':
      content = <>{title(task)}{row(design, 'project')}{row(say('Tomorrow', 'Demain'), 'calendar', '09:00')}{row('P1', 'flag')}<div className="cv-chips">{chip('←')}{chip('→')}{chip(say('Open as side panel', 'Ouvrir en panneau'))}</div></>; break;
    case 'time': case 'quick': case 'dust':
      content = <>{title(kind === 'dust' ? say('Gathering dust', 'Elles prennent la poussière') : kind === 'quick' ? say('Quick tasks', 'Tâches rapides') : say('I have 30 min', 'J’ai 30 min'))}{row(say('Reply to the email', 'Répondre au mail'), 'checkbox', '5 min')}{row(review, 'checkbox', '15 min')}{kind === 'dust' ? <div className="cv-chips">{chip(say('This week', 'Cette semaine'), 'accent')}{chip(say('Keep', 'Garder'))}{chip(say('Delete', 'Supprimer'))}</div> : <div className="cv-footnote">20 min / 30 min</div>}</>; break;
    case 'dashboard': case 'period':
      content = <>{title(say('This week', 'Cette semaine'))}<div className="cv-stats"><span><b>18 h 30</b>{say('Completed', 'Terminé')}</span><span><b className="cv-success">+12 %</b>{say('Previous period', 'Période précédente')}</span></div>{bars}</>; break;
    case 'dashboardLayout':
      content = <>{title(say('Edit layout', 'Modifier la disposition'))}{row(say('Completed tasks', 'Tâches terminées'), 'bars', '↑ ↓')}{row(say('Projects', 'Projets'), 'project', '↑ ↓')}{row(say('Time of day', 'Heures de la journée'), 'clock', '↑ ↓')}</>; break;
    case 'review':
      content = <>{title(say('Weekly review', 'Revue hebdomadaire'))}<div className="cv-steps"><span>✓</span><i /><span>✓</span><i /><span className="on">3</span><i /><span>4</span></div>{row(say('What belongs in this week?', 'Que gardez-vous cette semaine ?'), 'week')}<div className="cv-chips">{chip(say('This week', 'Cette semaine'), 'accent')}{chip(say('Someday', 'Un jour'))}</div></>; break;
    case 'subtaskTotal': case 'nesting':
      content = <>{row(task, 'checkbox', kind === 'subtaskTotal' ? '1 h' : undefined)}<div className="cv-indent">{row(review, 'checkbox', '30 min')}{row(say('Choose photos', 'Choisir les photos'), 'checkbox', '30 min')}</div>{kind === 'subtaskTotal' && <div className="cv-footnote">30 + 30 → 1 h</div>}</>; break;
    case 'checklist':
      content = <>{title(say('Launch checklist', 'Checklist de lancement'))}<div className="cv-completed">{row(say('Check the copy', 'Vérifier les textes'), 'checkbox', '✓')}</div>{row(say('Check links', 'Vérifier les liens'), 'checkbox')}{row(say('Publish the page', 'Publier la page'), 'checkbox')}<div className="cv-footnote">1 / 3</div></>; break;
    case 'conflicts':
      content = <>{title(say('Things to settle', 'Éléments à régler'))}{row(task, 'warning')}<div className="cv-chips">{chip('est-30', 'orange')}{chip('45 min', 'purple')}</div><div className="cv-footnote">{say('Choose the estimate to keep', 'Choisir l’estimation à conserver')}</div></>; break;
    case 'paste':
      content = <><div className="cv-field">{say('Prepare the brief', 'Préparer le brief')}<br />{review}<br />{say('Choose photos', 'Choisir les photos')}</div><div className="cv-footnote">↓ {say('Create 3 tasks', 'Créer 3 tâches')}</div></>; break;
    case 'upcomingGroups': case 'logbook':
      content = <>{title(say(kind === 'logbook' ? 'Logbook' : 'Group by', kind === 'logbook' ? 'Journal' : 'Grouper par'))}<div className="cv-chips">{chip(say('Day', 'Jour'))}{chip(say('Week', 'Semaine'), 'accent')}{chip(say('Month', 'Mois'))}</div>{row(say('This week', 'Cette semaine'), 'calendar', kind === 'logbook' ? '12 h 30' : '8')}{row(say('Last week', 'Semaine dernière'), 'calendar', kind === 'logbook' ? '18 h' : '4')}</>; break;
    case 'bulk':
      content = <><div className="cv-selected">{row(task, 'checkbox', '✓', true)}{row(review, 'checkbox', '✓', true)}</div><div className="cv-chips">{chip(say('Date', 'Date'))}{chip(say('Move', 'Déplacer'))}{chip(say('Tags', 'Tags'))}{chip('P1')}</div></>; break;
    case 'keyboard':
      content = <>{title(say('Keep your hands on the keyboard', 'Tout au clavier'))}<div className="cv-shortcuts"><span><kbd>↑</kbd><kbd>↓</kbd> {say('Navigate', 'Naviguer')}</span><span><kbd>↵</kbd> {say('Open task', 'Ouvrir')}</span><span><kbd>1</kbd>–<kbd>4</kbd> {say('Priority', 'Priorité')}</span><span><kbd>⌘</kbd><kbd>Z</kbd> {say('Undo', 'Annuler')}</span></div></>; break;
    case 'projectEmail':
      content = <>{title(say('Email to project', 'Un e-mail vers le projet'))}{row(design, 'project')}<div className="cv-field">project@todoist.net <Icon name="copy" size="sm" /></div><div className="cv-footnote">{say('Your email becomes a task', 'Votre e-mail devient une tâche')}</div></>; break;
    case 'signIn': case 'mac':
      content = <>{title(kind === 'mac' ? say('Quick Add, from anywhere', 'Ajout rapide, depuis partout') : say('Your Todoist, enhanced', 'Votre Todoist, en mieux'))}{kind === 'mac' ? <><div className="cv-chips">{chip('⌥')}{chip(say('Space', 'Espace'))}</div><div className="cv-field">{task} <span className="cv-success">↵</span></div></> : <div className="cv-connect">{say('Continue with Todoist', 'Continuer avec Todoist')} →</div>}</>; break;
    case 'undo':
      content = <>{row(task, 'checkbox', '✓')}<div className="cv-toast"><Icon name="check" size="sm" />{say('Task completed', 'Tâche terminée')}<b>{say('Undo', 'Annuler')}</b></div><div className="cv-footnote">⌘Z / Ctrl+Z</div></>; break;
    case 'sync': case 'offline':
      content = <>{title(kind === 'sync' ? say('Your settings follow you', 'Vos réglages vous suivent') : say('Keep working offline', 'Continuez hors connexion'))}<div className="cv-sync"><span>⌘</span><Icon name="repeat" /><span>▯</span></div><div className="cv-footnote">{kind === 'sync' ? say('Theme · Sidebar · Views', 'Thème · Barre latérale · Vues') : say('Changes saved locally, then synced', 'Changements enregistrés, puis synchronisés')}</div></>; break;
    case 'projectIcons':
      content = <>{title(say('Project icon', 'Icône du projet'))}<div className="cv-icon-grid">{(['project', 'star', 'globe', 'coffee', 'calendar', 'tasks', 'someday', 'file'] satisfies IconName[]).map((name) => <span key={name}><Icon name={name} /></span>)}</div></>; break;
    case 'completed':
      content = <>{title(design)}{row(say('Show completed tasks', 'Afficher les tâches terminées'), 'eye', '✓', true)}<div className="cv-completed">{row(review, 'check', '30 min')}{row(say('Send the proposal', 'Envoyer le devis'), 'check', '15 min')}</div></>; break;
    case 'matrix':
      content = <>{title(say('Eisenhower Matrix', 'Matrice d’Eisenhower'))}<div className="cv-matrix">{[say('Do', 'Faire'), say('Plan', 'Planifier'), say('Delegate', 'Déléguer'), say('Eliminate', 'Éliminer')].map((label, i) => <div key={label}><b>{label}</b><span>{[3, 5, 2, 1][i]}</span></div>)}</div></>; break;
    case 'swipe':
      content = <>{title(say('Swipe for quick actions', 'Glissez pour agir'))}<div className="cv-swipe">{row(task, 'checkbox')}<span><Icon name="calendar" size="sm" /><Icon name="clock" size="sm" /><Icon name="more" size="sm" /></span></div></>; break;
    case 'load': case 'week':
      content = <>{title(say('My week', 'Cette semaine'))}<div className="cv-stats"><span><b>18 h</b>{say('Planned', 'Planifié')}</span><span><b>25 h</b>{say('Capacity', 'Capacité')}</span></div><div className="cv-load"><i /></div>{bars}</>; break;
    case 'density':
      content = <>{title(say('List density', 'Densité des listes'))}<div className="cv-density"><div>{row(task)}{row(review)}</div><div>{row(task)}{row(review)}</div></div></>; break;
  }
  return <Fit kind={kind}>{content}</Fit>;
}
