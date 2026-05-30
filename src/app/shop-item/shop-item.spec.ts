import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShopItem } from './shop-item';

describe('ShopItem', () => {
  let component: ShopItem;
  let fixture: ComponentFixture<ShopItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShopItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShopItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
