import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MagicShop } from './magic-shop';

describe('MagicShop', () => {
  let component: MagicShop;
  let fixture: ComponentFixture<MagicShop>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MagicShop]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MagicShop);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
