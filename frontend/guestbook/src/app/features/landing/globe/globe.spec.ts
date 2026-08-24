import { TestBed } from '@angular/core/testing';
import { Globe } from './globe';

describe('Globe', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Globe],
    }).compileComponents();
  });

  it('should create and degrade gracefully without WebGL support', () => {
    const fixture = TestBed.createComponent(Globe);
    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render a decorative, hidden-from-screen-readers canvas wrapper', () => {
    const fixture = TestBed.createComponent(Globe);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const wrapper = compiled.querySelector('.globe');
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
    expect(compiled.querySelector('canvas')).toBeTruthy();
  });
});
