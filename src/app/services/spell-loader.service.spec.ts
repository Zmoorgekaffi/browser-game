import { TestBed } from '@angular/core/testing';

import { SpellLoaderService } from './spell-loader.service';

describe('SpellLoaderService', () => {
  let service: SpellLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpellLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
