import { TestBed } from '@angular/core/testing';

import { ReverseGameService } from './reverse-game.service';

describe('ReverseGameService', () => {
  let service: ReverseGameService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReverseGameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
