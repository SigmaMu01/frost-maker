import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemperatureProbe } from './temperature-probe';

describe('TemperatureProbe', () => {
  let component: TemperatureProbe;
  let fixture: ComponentFixture<TemperatureProbe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TemperatureProbe]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TemperatureProbe);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
