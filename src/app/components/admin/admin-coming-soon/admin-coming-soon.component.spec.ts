import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminComingSoonComponent } from './admin-coming-soon.component';

describe('AdminComingSoonComponent', () => {
  let component: AdminComingSoonComponent;
  let fixture: ComponentFixture<AdminComingSoonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminComingSoonComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminComingSoonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
