import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnimationObject } from './animation-object';

describe('AnimationObject', () => {
  let component: AnimationObject;
  let fixture: ComponentFixture<AnimationObject>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimationObject]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimationObject);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
