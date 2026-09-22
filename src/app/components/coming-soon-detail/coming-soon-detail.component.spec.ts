import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComingSoonDetailComponent } from './coming-soon-detail.component';

describe('ComingSoonDetailComponent', () => {
  let component: ComingSoonDetailComponent;
  let fixture: ComponentFixture<ComingSoonDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ComingSoonDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComingSoonDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
