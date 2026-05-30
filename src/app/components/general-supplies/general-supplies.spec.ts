import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralSupplies } from './general-supplies';

describe('GeneralSupplies', () => {
  let component: GeneralSupplies;
  let fixture: ComponentFixture<GeneralSupplies>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralSupplies]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralSupplies);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
