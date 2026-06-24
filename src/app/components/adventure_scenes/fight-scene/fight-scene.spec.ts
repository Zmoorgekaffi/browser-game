import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FightScene } from './fight-scene';

describe('FightScene', () => {
  let component: FightScene;
  let fixture: ComponentFixture<FightScene>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FightScene]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FightScene);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
