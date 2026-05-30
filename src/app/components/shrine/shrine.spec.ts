import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Shrine } from './shrine';

describe('Shrine', () => {
  let component: Shrine;
  let fixture: ComponentFixture<Shrine>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Shrine]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Shrine);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
