import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidenavEdit } from './sidenav-edit';

describe('SidenavEdit', () => {
  let component: SidenavEdit;
  let fixture: ComponentFixture<SidenavEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidenavEdit]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidenavEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
