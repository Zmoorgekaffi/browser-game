import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IntroScene } from './intro-scene';

describe('IntroScene', () => {
  let component: IntroScene;
  let fixture: ComponentFixture<IntroScene>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntroScene]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IntroScene);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
