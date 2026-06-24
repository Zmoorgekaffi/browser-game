import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LootScene } from './loot-scene';

describe('LootScene', () => {
  let component: LootScene;
  let fixture: ComponentFixture<LootScene>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LootScene]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LootScene);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
