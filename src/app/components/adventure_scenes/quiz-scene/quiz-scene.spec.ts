import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizScene } from './quiz-scene';

describe('QuizScene', () => {
  let component: QuizScene;
  let fixture: ComponentFixture<QuizScene>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizScene]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizScene);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
