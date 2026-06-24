import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogScene } from './dialog-scene';

describe('DialogScene', () => {
  let component: DialogScene;
  let fixture: ComponentFixture<DialogScene>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogScene]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DialogScene);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
