import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidenavView } from './sidenav-view';

describe('SidenavView', () => {
  let component: SidenavView;
  let fixture: ComponentFixture<SidenavView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidenavView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidenavView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
