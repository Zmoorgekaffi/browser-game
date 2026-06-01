import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventarItem } from './inventar-item';

describe('InventarItem', () => {
  let component: InventarItem;
  let fixture: ComponentFixture<InventarItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventarItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventarItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
