import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidenavSaver } from './sidenav-saver';

describe('SidenavSaver', () => {
  let component: SidenavSaver;
  let fixture: ComponentFixture<SidenavSaver>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidenavSaver]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidenavSaver);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
