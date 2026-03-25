import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewCube } from './view-cube';

describe('ViewCube', () => {
  let component: ViewCube;
  let fixture: ComponentFixture<ViewCube>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewCube);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
