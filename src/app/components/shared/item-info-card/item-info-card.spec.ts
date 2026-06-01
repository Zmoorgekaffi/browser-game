import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemInfoCard } from './item-info-card';

describe('ItemInfoCard', () => {
  let component: ItemInfoCard;
  let fixture: ComponentFixture<ItemInfoCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ItemInfoCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ItemInfoCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
