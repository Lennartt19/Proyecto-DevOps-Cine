import { TestBed } from '@angular/core/testing';

import { PaypalSimulationService } from './paypal-simulation.service';

describe('PaypalSimulationService', () => {
  let service: PaypalSimulationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaypalSimulationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
