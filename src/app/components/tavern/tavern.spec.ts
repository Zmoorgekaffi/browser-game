import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tavern } from './tavern';

describe('Tavern', () => {
  let component: Tavern;
  let fixture: ComponentFixture<Tavern>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tavern]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tavern);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
