import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnimatedCharacter } from './animated-character';

describe('AnimatedCharacter', () => {
  let component: AnimatedCharacter;
  let fixture: ComponentFixture<AnimatedCharacter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimatedCharacter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimatedCharacter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
