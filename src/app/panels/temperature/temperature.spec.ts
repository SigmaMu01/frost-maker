import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Temperature } from './temperature';

describe('Temperature', () => {
  let component: Temperature;
  let fixture: ComponentFixture<Temperature>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Temperature]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Temperature);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
