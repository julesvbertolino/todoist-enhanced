import type { CSSProperties } from 'react';
import { Icon } from './Icon';
import { ProjectIcon } from './ProjectIcon';
import { readProjectIcon } from '@/domain/projectIcons';
import type { Filter } from '@/domain/types';

/**
 * A filter's mark: the icon chosen for it, or the funnel.
 *
 * Todoist has no icon field on a filter. The choice rides at the end of the
 * filter's description, exactly as a project's does (see
 * `domain/projectIcons.ts`), so it follows the account and is never shown as
 * text where the description is read.
 */
export function FilterMark({ filter, className, style, size }: {
  filter: Pick<Filter, 'description'>;
  className?: string;
  style?: CSSProperties;
  size?: 'sm';
}) {
  const icon = readProjectIcon(filter.description);
  return icon
    ? <ProjectIcon iconId={icon} size={size} className={className} style={style} />
    : <Icon name="filter" size={size} className={className} style={style} />;
}
