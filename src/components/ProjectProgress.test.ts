import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectProgress } from './ProjectProgress';
import { wedge } from './ProgressRing';

describe('project completion indicator', () => {
  const render = (open: number, completed: number | undefined) => renderToStaticMarkup(createElement(ProjectProgress, { open, completed, label: 'Project' }));
  it('fills as tasks are completed', () => {
    expect(render(3, 0)).toContain('data-project-progress="0/3"');
    expect(render(3, 0)).not.toContain('project-progress-fill');
    expect(render(1, 2)).toContain('data-project-progress="2/3"');
    expect(render(1, 2)).toContain('<path class="project-progress-fill"');
    expect(render(0, 3)).toContain('<circle class="project-progress-fill" cx="10" cy="10" r="5.2"');
    expect(render(0, 3)).toContain('class="project-progress-track" cx="10" cy="10" r="7"');
  });
  it('keeps a visible unfinished slice until every task is complete', () => {
    expect(render(1, 99)).toContain('data-project-progress="99/100"');
    expect(render(1, 99)).toContain(`d="${wedge(0.85, 10, 10, 5.2)}"`);
    expect(render(0, 100)).toContain('<circle class="project-progress-fill"');
  });
  it('does not claim a percentage when counts are missing or empty', () => {
    expect(render(7, undefined)).toContain('data-project-progress="unknown"');
    expect(render(0, 0)).toContain('data-project-progress="unknown"');
    expect(render(7, undefined)).not.toContain('project-progress-fill');
  });
});
