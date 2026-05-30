import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Adventure } from './adventure';

describe('Adventure', () => {
  let component: Adventure;
  let fixture: ComponentFixture<Adventure>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Adventure]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Adventure);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
