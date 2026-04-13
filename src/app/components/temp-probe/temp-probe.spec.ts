import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TempProbe } from './temp-probe';

describe('TempProbe', () => {
  let component: TempProbe;
  let fixture: ComponentFixture<TempProbe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TempProbe]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TempProbe);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
