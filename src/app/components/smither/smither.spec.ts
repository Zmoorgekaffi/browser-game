import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Smither } from './smither';

describe('Smither', () => {
  let component: Smither;
  let fixture: ComponentFixture<Smither>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Smither]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Smither);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
